import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, UserProfile } from "@/contexts/AppContext";
import { StudyField, FIELD_LABELS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setProfile } = useApp();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState<"12" | "mezun">("12");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [tytScore, setTytScore] = useState("");
  const [aytScore, setAytScore] = useState("");
  const [scoreError, setScoreError] = useState(false);
  const [field, setField] = useState<StudyField>("sayisal");

  const progress = useSharedValue((step + 1) / TOTAL_STEPS);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  function nextStep() {
    // Validate score steps before proceeding
    if (step === 4) {
      const v = parseInt(tytScore, 10);
      if (!tytScore.trim() || isNaN(v) || v < 100 || v > 500) {
        setScoreError(true);
        return;
      }
    }
    if (step === 5) {
      const v = parseInt(aytScore, 10);
      if (!aytScore.trim() || isNaN(v) || v < 100 || v > 500) {
        setScoreError(true);
        return;
      }
    }
    setScoreError(false);
    if (step < TOTAL_STEPS - 1) {
      progress.value = withSpring((step + 2) / TOTAL_STEPS);
      setStep((s) => s + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      finish();
    }
  }

  function prevStep() {
    if (step > 0) {
      setScoreError(false);
      progress.value = withSpring(step / TOTAL_STEPS);
      setStep((s) => s - 1);
    }
  }

  function finish() {
    const profile: UserProfile = {
      name: name.trim() || "Öğrenci",
      grade,
      targetUniversity: university.trim() || "-",
      targetDepartment: department.trim() || "-",
      tytTargetScore: Math.min(500, Math.max(100, parseInt(tytScore) || 300)),
      aytTargetScore: Math.min(500, Math.max(100, parseInt(aytScore) || 300)),
      studyStartDate: new Date().toISOString().split("T")[0],
      studyField: field,
    };
    setProfile(profile);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  }

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return name.trim().length > 0;
    return true;
  };

  const steps = [
    <WelcomeStep key="welcome" colors={colors} />,
    <NameStep key="name" value={name} onChange={setName} colors={colors} />,
    <GradeStep key="grade" value={grade} onChange={setGrade} colors={colors} />,
    <UniversityStep key="uni" university={university} department={department} onChangeUni={setUniversity} onChangeDept={setDepartment} colors={colors} />,
    <TYTScoreStep
      key="tyt"
      value={tytScore}
      onChange={(v) => { setTytScore(v); if (scoreError) setScoreError(false); }}
      onBlur={() => setTytScore(clampScore(tytScore))}
      showError={scoreError}
      colors={colors}
    />,
    <AYTScoreStep
      key="ayt"
      value={aytScore}
      onChange={(v) => { setAytScore(v); if (scoreError) setScoreError(false); }}
      onBlur={() => setAytScore(clampScore(aytScore))}
      showError={scoreError}
      colors={colors}
    />,
    <FieldStep key="field" value={field} onChange={setField} colors={colors} />,
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step + 1} / {TOTAL_STEPS}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Animated.View key={step} entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContainer}>
          {steps[step]}
        </Animated.View>
      </KeyboardAvoidingView>

      <View style={styles.actions}>
        {step > 0 && (
          <TouchableOpacity onPress={prevStep} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={nextStep}
          disabled={!canProceed()}
          style={[
            styles.nextBtn,
            { backgroundColor: canProceed() ? colors.primary : colors.muted, flex: step > 0 ? 1 : undefined, marginLeft: step > 0 ? 12 : 0 },
          ]}
        >
          <Text style={[styles.nextBtnText, { color: canProceed() ? colors.primaryForeground : colors.mutedForeground }]}>
            {step === TOTAL_STEPS - 1 ? "Başla" : "Devam"}
          </Text>
          <Ionicons name={step === TOTAL_STEPS - 1 ? "checkmark" : "arrow-forward"} size={18} color={canProceed() ? colors.primaryForeground : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WelcomeStep({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.centeredStep}>
      <View style={[styles.welcomeIcon, { backgroundColor: colors.primary }]}>
        <Ionicons name="book" size={48} color="#fff" />
      </View>
      <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>KonuTakip'e{"\n"}Hoş Geldin</Text>
      <Text style={[styles.welcomeSubtitle, { color: colors.mutedForeground }]}>
        YKS sınavına hazırlanmanı takip etmek, planlamak ve başarıya ulaşman için buradayız.
      </Text>
    </Animated.View>
  );
}

function NameStep({ value, onChange, colors }: { value: string; onChange: (v: string) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.formStep}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Adın nedir?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>Sana nasıl sesleneceğimizi bilmek istiyoruz.</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        placeholder="Adın..."
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChange}
        autoFocus
        returnKeyType="done"
      />
    </Animated.View>
  );
}

function GradeStep({ value, onChange, colors }: { value: string; onChange: (v: "12" | "mezun") => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.formStep}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Sınıfın hangisi?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>Mevcut akademik durumunu seç.</Text>
      <View style={styles.optionsRow}>
        {([["12", "12. Sınıf"], ["mezun", "Mezun"]] as ["12" | "mezun", string][]).map(([val, label]) => (
          <TouchableOpacity
            key={val}
            onPress={() => { onChange(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.optionCard, { backgroundColor: value === val ? colors.primary : colors.card, borderColor: value === val ? colors.primary : colors.border }]}
          >
            <Text style={[styles.optionText, { color: value === val ? "#fff" : colors.foreground }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

function UniversityStep({ university, department, onChangeUni, onChangeDept, colors }: {
  university: string; department: string;
  onChangeUni: (v: string) => void; onChangeDept: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.formStep}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Hedefin nedir?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>Hedef üniversite ve bölümünü gir.</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, marginBottom: 12 }]}
        placeholder="Hedef Üniversite..."
        placeholderTextColor={colors.mutedForeground}
        value={university}
        onChangeText={onChangeUni}
        autoFocus
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        placeholder="Hedef Bölüm..."
        placeholderTextColor={colors.mutedForeground}
        value={department}
        onChangeText={onChangeDept}
      />
    </Animated.View>
  );
}

/** Strip any non-digit characters from input (handles paste, swipe keyboards, etc.) */
function filterScoreInput(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

/** Clamp a score string to [100, 500]; returns empty string unchanged. */
function clampScore(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const num = parseInt(trimmed, 10);
  if (isNaN(num)) return "";
  if (num < 100) return "100";
  if (num > 500) return "500";
  return String(num);
}

type ScoreStepProps = {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  showError: boolean;
  colors: ReturnType<typeof useColors>;
};

function TYTScoreStep({ value, onChange, onBlur, showError, colors }: ScoreStepProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.formStep}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>TYT Hedef Puan</Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>Ulaşmak istediğin TYT puanı nedir? (100–500)</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: showError ? colors.destructive : colors.border, color: colors.foreground },
        ]}
        placeholder="Örn: 350"
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={(t) => onChange(filterScoreInput(t))}
        onBlur={onBlur}
        keyboardType="number-pad"
        maxLength={3}
        autoFocus
      />
      {showError && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          Lütfen 100 ile 500 arasında bir hedef puan giriniz.
        </Text>
      )}
    </Animated.View>
  );
}

function AYTScoreStep({ value, onChange, onBlur, showError, colors }: ScoreStepProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.formStep}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>AYT Hedef Puan</Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>Ulaşmak istediğin AYT puanı nedir? (100–500)</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: showError ? colors.destructive : colors.border, color: colors.foreground },
        ]}
        placeholder="Örn: 400"
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={(t) => onChange(filterScoreInput(t))}
        onBlur={onBlur}
        keyboardType="number-pad"
        maxLength={3}
        autoFocus
      />
      {showError && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          Lütfen 100 ile 500 arasında bir hedef puan giriniz.
        </Text>
      )}
    </Animated.View>
  );
}

function FieldStep({ value, onChange, colors }: { value: StudyField; onChange: (v: StudyField) => void; colors: ReturnType<typeof useColors> }) {
  const fields: StudyField[] = ["sayisal", "esitAgirlik", "sozel"];
  const descriptions: Record<StudyField, string> = {
    sayisal: "Mat, Fizik, Kimya, Biyoloji",
    esitAgirlik: "Mat, Edebiyat, Tarih, Coğrafya",
    sozel: "Edebiyat, Tarih, Coğrafya, Felsefe",
  };
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.formStep}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Çalışma Alanın</Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>AYT sınav alanını seç.</Text>
      <View style={styles.optionsColumn}>
        {fields.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => { onChange(f); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.fieldCard, { backgroundColor: value === f ? colors.primary : colors.card, borderColor: value === f ? colors.primary : colors.border }]}
          >
            <Text style={[styles.fieldLabel, { color: value === f ? "#fff" : colors.foreground }]}>{FIELD_LABELS[f]}</Text>
            <Text style={[styles.fieldDesc, { color: value === f ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>{descriptions[f]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  flex: { flex: 1 },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  stepText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  stepContainer: { flex: 1, justifyContent: "center" },
  centeredStep: { alignItems: "center", paddingHorizontal: 16 },
  welcomeIcon: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  welcomeTitle: { fontSize: 32, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 16, lineHeight: 40 },
  welcomeSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24, fontFamily: "Inter_400Regular" },
  formStep: { paddingHorizontal: 4 },
  stepTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8 },
  stepSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 28, lineHeight: 22 },
  input: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: "Inter_400Regular",
  },
  optionsRow: { flexDirection: "row", gap: 12 },
  optionCard: {
    flex: 1, paddingVertical: 20, borderRadius: 16, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  optionText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  optionsColumn: { gap: 12 },
  fieldCard: { padding: 20, borderRadius: 16, borderWidth: 1.5 },
  fieldLabel: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  fieldDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 0, paddingTop: 16 },
  backBtn: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  nextBtn: {
    height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingHorizontal: 28,
  },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
});
