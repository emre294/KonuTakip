/**
 * Native date and time picker fields.
 * iOS/Android: opens the system picker on tap.
 * Web: falls back to a plain text input (no native picker available).
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
  TextInput,
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

// ─── Date picker ──────────────────────────────────────────────────────────────

interface DatePickerFieldProps {
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  colors: Colors;
  style?: object;
}

export function DatePickerField({
  value,
  onChange,
  colors,
  style,
}: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const date = value ? new Date(value + "T12:00:00") : new Date();

  const display = value
    ? new Date(value + "T12:00:00").toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShow(false);
    if (selected) {
      onChange(selected.toISOString().split("T")[0]);
    }
  }

  if (Platform.OS === "web") {
    return (
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }, style]}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-AA-GG"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="numeric"
      />
    );
  }

  if (Platform.OS === "android") {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShow(true)}
          style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }, style]}
          activeOpacity={0.7}
        >
          <Text style={[styles.pickerText, { color: display ? colors.foreground : colors.mutedForeground }]}>
            {display || "Tarih seç..."}
          </Text>
          <Feather name="calendar" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={date}
            mode="date"
            display="calendar"
            onChange={handleChange}
          />
        )}
      </>
    );
  }

  // iOS — show picker in a modal with a "Done" button
  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }, style]}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, { color: display ? colors.foreground : colors.mutedForeground }]}>
          {display || "Tarih seç..."}
        </Text>
        <Feather name="calendar" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal
        visible={show}
        transparent
        animationType="slide"
        onRequestClose={() => setShow(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)} />
        <View style={[styles.iosPickerSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.iosPickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.iosPickerTitle, { color: colors.foreground }]}>Tarih Seç</Text>
            <TouchableOpacity onPress={() => setShow(false)} style={[styles.doneBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.doneBtnText}>Tamam</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={date}
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
  value: string; // "HH:MM"
  onChange: (v: string) => void;
  colors: Colors;
  style?: object;
}

function timeStrToDate(timeStr: string): Date {
  const d = new Date();
  const [h = 9, m = 0] = timeStr.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeStr(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function TimePickerField({
  value,
  onChange,
  colors,
  style,
}: TimePickerFieldProps) {
  const [show, setShow] = useState(false);

  const date = timeStrToDate(value);

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShow(false);
    if (selected) {
      onChange(dateToTimeStr(selected));
    }
  }

  if (Platform.OS === "web") {
    return (
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }, style]}
        value={value}
        onChangeText={onChange}
        placeholder="SS:DD"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="numeric"
        maxLength={5}
      />
    );
  }

  if (Platform.OS === "android") {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShow(true)}
          style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }, style]}
          activeOpacity={0.7}
        >
          <Text style={[styles.pickerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
            {value || "Saat seç..."}
          </Text>
          <Feather name="clock" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={date}
            mode="time"
            display="clock"
            onChange={handleChange}
            is24Hour
          />
        )}
      </>
    );
  }

  // iOS — modal
  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.input, styles.pickerTouchable, { backgroundColor: colors.card, borderColor: colors.border }, style]}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value || "Saat seç..."}
        </Text>
        <Feather name="clock" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal
        visible={show}
        transparent
        animationType="slide"
        onRequestClose={() => setShow(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)} />
        <View style={[styles.iosPickerSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.iosPickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.iosPickerTitle, { color: colors.foreground }]}>Saat Seç</Text>
            <TouchableOpacity onPress={() => setShow(false)} style={[styles.doneBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.doneBtnText}>Tamam</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={date}
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

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  pickerTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  iosPickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  iosPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iosPickerTitle: {
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
