/**
 * Native date and time picker fields.
 *
 * Android : system calendar / clock dialog — no text input at all.
 * iOS     : spinner DateTimePicker inside a slide-up modal.
 * Web     : styled button with an *invisible* <input type="date|time"> overlaid
 *           on top. The user taps the button → the browser's native picker opens.
 *           No text field is ever exposed; arbitrary text input is impossible.
 *
 * Display format:  date → DD.MM.YYYY   time → HH:MM (24-hour)
 * Internal format: date → YYYY-MM-DD   time → HH:MM
 */
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "2026-07-03" → "03.07.2026" */
function toDDMMYYYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function timeStrToDate(t: string): Date {
  const now = new Date();
  const [h = 9, m = 0] = t.split(":").map(Number);
  now.setHours(h, m, 0, 0);
  return now;
}

function dateToTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── Date picker ──────────────────────────────────────────────────────────────

interface DatePickerFieldProps {
  /** ISO date string "YYYY-MM-DD" — stored internally, never shown raw to the user */
  value: string;
  onChange: (v: string) => void;
  colors: Colors;
}

export function DatePickerField({ value, onChange, colors }: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const dateObj = value ? new Date(value + "T12:00:00") : new Date();
  const display = toDDMMYYYY(value); // always shown as DD.MM.YYYY

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShow(false);
    if (selected) onChange(selected.toISOString().split("T")[0]);
  }

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
          onChange: (e: any) => onChange(e.target.value),
          // Invisible overlay that fills the button and captures the tap
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

  // ── Android: native calendar dialog — TouchableOpacity opens the picker
  if (Platform.OS === "android") {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShow(true)}
          style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.pickerText, { color: display ? colors.foreground : colors.mutedForeground }]}>
            {display || "Tarih seç..."}
          </Text>
          <Feather name="calendar" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display="calendar"
            onChange={handleChange}
          />
        )}
      </>
    );
  }

  // ── iOS: spinner inside a slide-up modal
  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, { color: display ? colors.foreground : colors.mutedForeground }]}>
          {display || "Tarih seç..."}
        </Text>
        <Feather name="calendar" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)} />
        <View style={[styles.iosSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.iosHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.iosTitle, { color: colors.foreground }]}>Tarih Seç</Text>
            <TouchableOpacity onPress={() => setShow(false)} style={[styles.doneBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.doneBtnText}>Tamam</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display="spinner"
            onChange={handleChange}
            style={{ alignSelf: "center" }}
          />
        </View>
      </Modal>
    </>
  );
}

// ─── Time picker ──────────────────────────────────────────────────────────────

interface TimePickerFieldProps {
  /** "HH:MM" 24-hour format */
  value: string;
  onChange: (v: string) => void;
  colors: Colors;
}

export function TimePickerField({ value, onChange, colors }: TimePickerFieldProps) {
  const [show, setShow] = useState(false);

  const dateObj = timeStrToDate(value);

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShow(false);
    if (selected) onChange(dateToTimeStr(selected));
  }

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

  // ── Android: native clock dialog
  if (Platform.OS === "android") {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShow(true)}
          style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.pickerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
            {value || "Saat seç..."}
          </Text>
          <Feather name="clock" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={dateObj}
            mode="time"
            display="clock"
            onChange={handleChange}
            is24Hour
          />
        )}
      </>
    );
  }

  // ── iOS: spinner modal
  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value || "Saat seç..."}
        </Text>
        <Feather name="clock" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)} />
        <View style={[styles.iosSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.iosHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.iosTitle, { color: colors.foreground }]}>Saat Seç</Text>
            <TouchableOpacity onPress={() => setShow(false)} style={[styles.doneBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.doneBtnText}>Tamam</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={dateObj}
            mode="time"
            display="spinner"
            onChange={handleChange}
            is24Hour
            style={{ alignSelf: "center" }}
          />
        </View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  iosSheet: {
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
});
