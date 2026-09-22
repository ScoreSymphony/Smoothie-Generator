import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DEFAULT_USER_PREFERENCES,
  clearPreferenceFeedback,
  sanitizeUserPreferences,
  type UserPreferences,
} from "@/domain/preferences";
import {
  loadUserPreferences,
  resetUserPreferences,
  saveUserPreferences,
} from "@/storage/preferencesStorage";
import { colors, spacing, typography } from "@/theme/tokens";

type BooleanPreferenceKey =
  | "vegan"
  | "vegetarian"
  | "dairyFree"
  | "refreshing"
  | "filling"
  | "proteinRich"
  | "lowerCalorie"
  | "breakfast"
  | "postWorkout";

const DIET = [
  ["vegan", "Vegan"],
  ["vegetarian", "Vegetarisch"],
  ["dairyFree", "Milchfrei"],
] as const satisfies readonly (readonly [BooleanPreferenceKey, string])[];

const GOALS = [
  ["refreshing", "Erfrischend"],
  ["filling", "Sättigend"],
  ["proteinRich", "Proteinreich"],
  ["lowerCalorie", "Kalorienärmer"],
  ["breakfast", "Frühstück"],
  ["postWorkout", "Nach dem Sport"],
] as const satisfies readonly (readonly [BooleanPreferenceKey, string])[];

const ALLERGIES = [
  ["nuts", "Nüsse"],
  ["peanuts", "Erdnüsse"],
  ["milk", "Milch"],
  ["soy", "Soja"],
  ["gluten", "Gluten"],
  ["sesame", "Sesam"],
  ["celery", "Sellerie"],
] as const;

export default function SettingsScreen() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadUserPreferences().then(setPreferences);
  }, []);

  const commit = (next: UserPreferences) => {
    setPreferences(next);
    setMessage(null);
    void saveUserPreferences(next).catch(() =>
      setMessage("Die Einstellungen konnten nicht gespeichert werden."),
    );
  };

  const setBoolean = (key: BooleanPreferenceKey, value: boolean) => {
    if (!preferences) return;
    commit(sanitizeUserPreferences({ ...preferences, [key]: value }));
  };

  const setScale = (
    key: "desiredSweetness" | "desiredCreaminess",
    delta: number,
  ) => {
    if (!preferences) return;
    const current = preferences[key] ?? 3;
    const nextValue = Math.max(0, Math.min(5, current + delta));
    commit(sanitizeUserPreferences({ ...preferences, [key]: nextValue }));
  };

  const toggleAllergy = (allergy: string) => {
    if (!preferences) return;
    const active = preferences.allergies.includes(allergy);
    commit(
      sanitizeUserPreferences({
        ...preferences,
        allergies: active
          ? preferences.allergies.filter((item) => item !== allergy)
          : [...preferences.allergies, allergy],
      }),
    );
  };

  if (!preferences) {
    return <SafeAreaView edges={["bottom"]} style={styles.safeArea}><View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Vorlieben</Text>
          <Text style={styles.muted}>
            Alles bleibt lokal auf diesem Handy und beeinflusst deine Empfehlungen.
          </Text>
        </View>

        {message ? <Text accessibilityRole="alert" style={styles.warning}>{message}</Text> : null}

        <PreferenceSection title="Ernährung">
          {DIET.map(([key, label]) => (
            <ToggleRow key={key} label={label} value={preferences[key]} onChange={(value) => setBoolean(key, value)} />
          ))}
        </PreferenceSection>

        <PreferenceSection title="Allergien">
          <View style={styles.chips}>
            {ALLERGIES.map(([key, label]) => {
              const active = preferences.allergies.includes(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleAllergy(key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {active ? "✓ " : ""}{label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </PreferenceSection>

        <PreferenceSection title="Geschmack">
          <ScaleRow label="Süße" value={preferences.desiredSweetness ?? 3} onMinus={() => setScale("desiredSweetness", -1)} onPlus={() => setScale("desiredSweetness", 1)} />
          <ScaleRow label="Cremigkeit" value={preferences.desiredCreaminess ?? 3} onMinus={() => setScale("desiredCreaminess", -1)} onPlus={() => setScale("desiredCreaminess", 1)} />
        </PreferenceSection>

        <PreferenceSection title="Ziele">
          {GOALS.map(([key, label]) => (
            <ToggleRow key={key} label={label} value={preferences[key]} onChange={(value) => setBoolean(key, value)} />
          ))}
        </PreferenceSection>

        <PreferenceSection title="Lernen & Daten">
          <Pressable
            accessibilityRole="button"
            onPress={() => commit(clearPreferenceFeedback(preferences))}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Feedback zurücksetzen</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void resetUserPreferences();
              setPreferences(DEFAULT_USER_PREFERENCES);
              setMessage("Vorlieben wurden zurückgesetzt.");
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Alle Vorlieben zurücksetzen</Text>
          </Pressable>
        </PreferenceSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceSection({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function ToggleRow({ label, value, onChange }: { readonly label: string; readonly value: boolean; readonly onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

function ScaleRow({ label, value, onMinus, onPlus }: { readonly label: string; readonly value: number; readonly onMinus: () => void; readonly onPlus: () => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable accessibilityLabel={`${label} verringern`} accessibilityRole="button" onPress={onMinus} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable>
        <Text style={styles.scaleValue}>{value}/5</Text>
        <Pressable accessibilityLabel={`${label} erhöhen`} accessibilityRole="button" onPress={onPlus} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: typography.hero, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: typography.body, lineHeight: 23 },
  warning: { backgroundColor: "#FFF2CC", borderRadius: 12, color: colors.text, padding: spacing.md },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontWeight: "800" },
  toggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 50 },
  rowLabel: { color: colors.text, flex: 1, fontSize: typography.body, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: "700" },
  chipTextActive: { color: colors.onAccent },
  stepper: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  stepButton: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  stepText: { color: colors.text, fontSize: 22, fontWeight: "800" },
  scaleValue: { color: colors.text, fontWeight: "800", minWidth: 36, textAlign: "center" },
  secondaryButton: { alignItems: "center", borderColor: colors.accent, borderRadius: 14, borderWidth: 1, minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.md },
  secondaryText: { color: colors.accent, fontWeight: "800" },
});
