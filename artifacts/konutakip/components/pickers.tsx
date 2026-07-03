/**
 * Date and time picker fields.
 *
 * IMPORTANT: This app runs inside Expo Go (no custom dev client / EAS build),
 * and `@react-native-community/datetimepicker` requires native linking that is
 * NOT present in Expo Go on Android or iOS (Expo removed it from the Expo Go
 * binary). Rendering that component inside Expo Go silently fails to open any
 * dialog — the field looks "dead" even though the JS wiring is correct. So for
 * Android/iOS we use a fully custom, pure-JS calendar/time picker (no native
 * modules) that works everywhere Expo Go runs. On web we keep the native
 * `<input type="date"|"time">` overlay since browsers always support it.
 *
 * IMPORTANT #2: the calendar/wheel overlay is rendered as a plain absolutely
 * positioned View — NOT as a second <Modal>. Nesting a React Native <Modal>
 * inside another already-visible <Modal> is unreliable on Android (the
 * platform's native Dialog window stacking can swallow or hide the inner
 * modal, so the field looks like it "does nothing" when tapped even though
 * the state changes correctly). The parent screen (e.g. plan.tsx) owns a
 * single `activePicker` state and renders <PickerOverlay> once, as a direct
 * sibling inside its one real <Modal>, covering the full screen.
 *
 * Either way: no free-text entry is ever possible, only tap-to-select.
 *
 * Display format:  date → DD.MM.YYYY   time → HH:MM (24-hour)
 * Internal format: date → YYYY-MM-DD   time → HH:MM
 */
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Colors = {
  card: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  background: string;
};

export type ActivePicker = "date" | "time" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "2026-07-03" → "03.07.2026" */
function toDDMMYYYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Monday ... 6 = Sunday (Turkish week starts Monday) */
function mondayFirstWeekday(year: number, month: number, day: number): number {
  const jsDay = new Date(year, month, day).getDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

// ─── Date field (button) ───────────────────────────────────────────────────────

interface DatePickerFieldProps {
  /** ISO date string "YYYY-MM-DD" — stored internally, never shown raw to the user */
  value: string;
  onChange: (v: string) => void;
  colors: Colors;
  /** Only used on Android/iOS: called when the user taps the field to request the overlay open. */
  onOpen?: () => void;
  /** ISO "YYYY-MM-DD" — earliest selectable date (inclusive). Web: sets min on <input>. */
  minDate?: string;
  /** ISO "YYYY-MM-DD" — latest selectable date (inclusive). Web: sets max on <input>. */
  maxDate?: string;
}

export function DatePickerField({ value, onChange, colors, onOpen, minDate, maxDate }: DatePickerFieldProps) {
  const display = toDDMMYYYY(value); // always shown as DD.MM.YYYY

  // ── Web: show the styled button, overlay a transparent <input type="date">
  //    so the browser's native date picker fires on tap — no text entry possible.
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.input,
          styles.pickerTouchable,
          { backgroundColor: colors.card, borderColor: colors.border, position: "relative" },
        ]}
      >
        <Text style={[styles.pickerText, { color: display ? colors.foreground : colors.mutedForeground }]}>
          {display || "Tarih seç..."}
        </Text>
        <Feather name="calendar" size={16} color={colors.mutedForeground} />
        {React.createElement("input", {
          type: "date",
          value: value,
          min: minDate,
          max: maxDate,
          onChange: (e: any) => onChange(e.target.value),
          style: {
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
            width: "100%",
            height: "100%",
            zIndex: 2,
          },
        })}
      </View>
    );
  }

  // ── Android / iOS: button only. Tapping requests the parent to show
  //    <PickerOverlay activePicker="date" .../> — see note at top of file.
  return (
    <TouchableOpacity
      onPress={onOpen}
      style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.pickerText, { color: display ? colors.foreground : colors.mutedForeground }]}>
        {display || "Tarih seç..."}
      </Text>
      <Feather name="calendar" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

// ─── Time field (button) ───────────────────────────────────────────────────────

interface TimePickerFieldProps {
  /** "HH:MM" 24-hour format */
  value: string;
  onChange: (v: string) => void;
  colors: Colors;
  /** Only used on Android/iOS: called when the user taps the field to request the overlay open. */
  onOpen?: () => void;
}

export function TimePickerField({ value, onChange, colors, onOpen }: TimePickerFieldProps) {
  // ── Web: transparent <input type="time"> overlay
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.input,
          styles.pickerTouchable,
          { backgroundColor: colors.card, borderColor: colors.border, position: "relative" },
        ]}
      >
        <Text style={[styles.pickerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value || "Saat seç..."}
        </Text>
        <Feather name="clock" size={16} color={colors.mutedForeground} />
        {React.createElement("input", {
          type: "time",
          value: value,
          onChange: (e: any) => onChange(e.target.value),
          style: {
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
            width: "100%",
            height: "100%",
            zIndex: 2,
          },
        })}
      </View>
    );
  }

  // ── Android / iOS: button only. Tapping requests the parent to show
  //    <PickerOverlay activePicker="time" .../> — see note at top of file.
  return (
    <TouchableOpacity
      onPress={onOpen}
      style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.pickerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
        {value || "Saat seç..."}
      </Text>
      <Feather name="clock" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

// ─── Wheel (used by the time overlay) ──────────────────────────────────────────

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const WHEEL_WIDTH = 80; // extracted so FlatList gets the same explicit value
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function Wheel({
  data,
  selectedIndex,
  onSelect,
  colors,
}: {
  data: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  colors: Colors;
}) {
  const listRef = useRef<FlatList<number>>(null);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    onSelect(index);
  }

  return (
    // Explicit WHEEL_WIDTH on both the container and the FlatList prevents
    // Samsung One UI from injecting internal ScrollView left-padding that
    // shifts content off-centre. overflow:"hidden" clips items outside the
    // visible window without affecting the width calculation.
    <View style={{ height: WHEEL_HEIGHT, width: WHEEL_WIDTH, overflow: "hidden" }}>
      <View pointerEvents="none" style={[styles.wheelHighlight, { borderColor: colors.primary, top: ITEM_HEIGHT * 2 }]} />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(n) => String(n)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={selectedIndex}
        // Explicit width: FlatList must know its own width to centre items.
        // Without this, some Android WebView renders measure it as 0 or full-screen,
        // creating the right-shift symptom visible on Samsung devices.
        style={{ width: WHEEL_WIDTH }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        onMomentumScrollEnd={handleMomentumEnd}
        // Prevent Samsung's clipping optimisation from repositioning list items
        removeClippedSubviews={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.wheelItem}
            activeOpacity={0.6}
            onPress={() => {
              onSelect(index);
              listRef.current?.scrollToIndex({ index, animated: true });
            }}
          >
            <Text
              style={[
                styles.wheelItemText,
                { color: index === selectedIndex ? colors.foreground : colors.mutedForeground },
                index === selectedIndex && styles.wheelItemTextSelected,
              ]}
            >
              {pad2(item)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─── Shared overlay — rendered ONCE by the parent screen, never nested in a Modal ──

interface PickerOverlayProps {
  /** Which picker to show. Render nothing at all when null. */
  activePicker: "date" | "time";
  dateValue: string;
  timeValue: string;
  onChangeDate: (v: string) => void;
  onChangeTime: (v: string) => void;
  onClose: () => void;
  colors: Colors;
  /** ISO "YYYY-MM-DD" — earliest selectable date (inclusive). */
  minDate?: string;
  /** ISO "YYYY-MM-DD" — latest selectable date (inclusive). */
  maxDate?: string;
}

export function PickerOverlay({
  activePicker,
  dateValue,
  timeValue,
  onChangeDate,
  onChangeTime,
  onClose,
  colors,
  minDate,
  maxDate,
}: PickerOverlayProps) {
  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      {activePicker === "date" ? (
        <DateCalendar value={dateValue} onChange={(v) => { onChangeDate(v); onClose(); }} onClose={onClose} colors={colors} minDate={minDate} maxDate={maxDate} />
      ) : (
        <TimeWheelPicker value={timeValue} onChange={(v) => { onChangeTime(v); onClose(); }} onClose={onClose} colors={colors} />
      )}
    </View>
  );
}

function DateCalendar({
  value,
  onChange,
  colors,
  minDate,
  maxDate,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  colors: Colors;
  minDate?: string;
  maxDate?: string;
}) {
  const initial = value ? new Date(value + "T12:00:00") : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // ── Compute nav-button disabled states ───────────────────────────────────
  const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevMonthYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevMonthLastDay = daysInMonth(prevMonthYear, prevMonthIdx);
  const prevMonthEnd = `${prevMonthYear}-${pad2(prevMonthIdx + 1)}-${pad2(prevMonthLastDay)}`;
  const isPrevDisabled = !!minDate && prevMonthEnd < minDate;

  const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextMonthStart = `${nextMonthYear}-${pad2(nextMonthIdx + 1)}-01`;
  const isNextDisabled = !!maxDate && nextMonthStart > maxDate;

  function goPrevMonth() {
    if (isPrevDisabled) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function goNextMonth() {
    if (isNextDisabled) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const leadingBlanks = mondayFirstWeekday(viewYear, viewMonth, 1);
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const _today = new Date();
  const todayISO = `${_today.getFullYear()}-${pad2(_today.getMonth() + 1)}-${pad2(_today.getDate())}`;

  // "Bugün" button is only shown when today is within the allowed window
  const todaySelectable = (!minDate || todayISO >= minDate) && (!maxDate || todayISO <= maxDate);

  return (
    <View style={styles.modalCenterWrap} pointerEvents="box-none">
      <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={goPrevMonth}
            style={[styles.calendarNavBtn, isPrevDisabled && { opacity: 0.3 }]}
            hitSlop={8}
            disabled={isPrevDisabled}
          >
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.calendarTitle, { color: colors.foreground }]}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity
            onPress={goNextMonth}
            style={[styles.calendarNavBtn, isNextDisabled && { opacity: 0.3 }]}
            hitSlop={8}
            disabled={isNextDisabled}
          >
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((w) => (
            <View key={w} style={styles.dayCell}>
              <Text style={[styles.weekdayLabel, { color: colors.mutedForeground }]}>{w}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {cells.map((day, idx) => {
            if (day === null) return <View key={`b-${idx}`} style={styles.dayCell} />;
            const iso = toISODate(viewYear, viewMonth, day);
            const isSelected = iso === value;
            const isToday = iso === todayISO;
            const isDisabled = (!!minDate && iso < minDate) || (!!maxDate && iso > maxDate);

            if (isDisabled) {
              return (
                <View key={iso} style={[styles.dayCell, { opacity: 0.25 }]}>
                  <View style={styles.dayCircle}>
                    <Text style={[styles.dayText, { color: colors.foreground }]}>{day}</Text>
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={iso}
                style={styles.dayCell}
                onPress={() => onChange(iso)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {todaySelectable && (
          <TouchableOpacity
            onPress={() => {
              const now = new Date();
              onChange(toISODate(now.getFullYear(), now.getMonth(), now.getDate()));
            }}
            style={[styles.todayBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.todayBtnText, { color: colors.primary }]}>Bugün</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function TimeWheelPicker({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  colors: Colors;
}) {
  const [hour, minute] = useMemo(() => {
    const [h = 9, m = 0] = value.split(":").map(Number);
    return [h, m];
  }, [value]);
  const [tempHour, setTempHour] = useState(hour);
  const [tempMinute, setTempMinute] = useState(minute);

  // Resync wheel positions when the picker reopens with a different external value.
  // Without this, closing, changing the time elsewhere, and reopening would show
  // stale wheel positions even though the displayed field value is correct.
  useEffect(() => { setTempHour(hour); }, [hour]);
  useEffect(() => { setTempMinute(minute); }, [minute]);

  return (
    <View style={[styles.iosSheet, { backgroundColor: colors.card }]}>
      <View style={[styles.iosHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.iosTitle, { color: colors.foreground }]}>Saat Seç</Text>
        <TouchableOpacity
          onPress={() => onChange(`${pad2(tempHour)}:${pad2(tempMinute)}`)}
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.doneBtnText}>Tamam</Text>
        </TouchableOpacity>
      </View>
      {/* wheelCol (flex:1) gives each side an equal share of the sheet width.
          Flexbox computes the split, so it is immune to font-metric differences
          that caused the minute wheel to drift right on Samsung devices when the
          layout depended on the colon's intrinsic text width + margins. */}
      <View style={styles.wheelRow}>
        <View style={styles.wheelCol}>
          <Wheel data={HOURS} selectedIndex={tempHour} onSelect={setTempHour} colors={colors} />
        </View>
        <View style={styles.wheelColonWrapper}>
          <Text style={[styles.wheelColon, { color: colors.foreground }]}>:</Text>
        </View>
        <View style={styles.wheelCol}>
          <Wheel data={MINUTES} selectedIndex={tempMinute} onSelect={setTempMinute} colors={colors} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  overlayRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 50,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCenterWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCard: {
    width: 320,
    maxWidth: "90%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 6,
  },
  calendarTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  weekRow: {
    flexDirection: "row",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  todayBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  iosSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  iosHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iosTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  wheelRow: {
    flexDirection: "row",
    // "center" is correct because both wheelCol children are the same height
    // (they expand to contain WHEEL_HEIGHT wheels). No sub-pixel drift risk
    // because sizing is now driven by flex:1 columns, not text metrics.
    alignItems: "center",
    // No justifyContent needed — flex:1 columns fill the full row width.
    paddingVertical: 16,
  },
  // Each column takes exactly half the available width (minus the colon),
  // computed by flexbox rather than by margin arithmetic or text metrics.
  // This is the primary fix for the Samsung horizontal drift: symmetry is
  // guaranteed by the layout engine, not by counting pixels.
  wheelCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelColonWrapper: {
    // Fixed width (wider than any ":" glyph on any device) so the colon
    // area never varies by font metrics. This keeps both wheelCol sides
    // exactly symmetric regardless of platform or font loading order.
    width: 40,
    height: WHEEL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    // width:"100%" ensures each item fills the FlatList's measured width so
    // alignItems:"center" centres the text within a known, consistent box —
    // not within whatever width the layout engine guesses on Samsung devices.
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
  },
  wheelItemTextSelected: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
  },
  wheelColon: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
  },
});
