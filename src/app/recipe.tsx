import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecipeMetricsPanel } from "@/components/RecipeMetricsPanel";
import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import {
  resolveRecommendationKey,
  type RecommendationView,
} from "@/domain/recommendations";
import {
  toggleFavoriteRecipe,
  withFeedback,
  type FeedbackValue,
  type UserPreferences,
} from "@/domain/preferences";
import type { PantryState } from "@/domain/pantry";
import { addRecommendationToHistory } from "@/storage/historyStorage";
import { loadPantryState } from "@/storage/pantryStorage";
import { loadUserPreferences, saveUserPreferences } from "@/storage/preferencesStorage";
import { colors, spacing, typography } from "@/theme/tokens";

export default function RecipeScreen() {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const rawKey = Array.isArray(params.key) ? params.key[0] : params.key;
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationView | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    if (!rawKey) {
      setNotFound(true);
      return;
    }
    void Promise.all([loadPantryState(), loadUserPreferences()]).then(([p, prefs]) => {
      if (!active) return;
      setPantry(p);
      setPreferences(prefs);
      const resolved = resolveRecommendationKey(rawKey, p, prefs);
      if (!resolved) {
        setNotFound(true);
        return;
      }
      setRecommendation(resolved);
      void addRecommendationToHistory(resolved);
    });
    return () => { active = false; };
  }, [rawKey]);

  if (notFound) {
    return <SafeAreaView edges={["bottom"]} style={styles.safeArea}><View style={styles.center}><Text style={styles.title}>Rezept nicht gefunden</Text><Text style={styles.muted}>Dieses Rezept ist nicht mehr verfügbar.</Text></View></SafeAreaView>;
  }

  if (!pantry || !preferences || !recommendation) {
    return <SafeAreaView edges={["bottom"]} style={styles.safeArea}><View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View></SafeAreaView>;
  }

  const catalog = loadBundledIngredientCatalog();
  const favorite = preferences.favoriteRecipeKeys.includes(recommendation.key);
  const feedback = preferences.feedback[recommendation.key];

  const updatePreferences = (next: UserPreferences) => {
    setPreferences(next);
    void saveUserPreferences(next);
  };

  const setFeedback = (value: FeedbackValue) => {
    updatePreferences(withFeedback(preferences, recommendation.key, value));
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            {recommendation.source === "stored" ? "REZEPT" : "NEU KOMBINIERT"}
          </Text>
          <Text style={styles.title}>{recommendation.title}</Text>
          <Text style={styles.availability}>{recommendation.availabilityLabel}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => updatePreferences(toggleFavoriteRecipe(preferences, recommendation.key))}
          style={[styles.favoriteButton, favorite && styles.favoriteActive]}
        >
          <Text style={[styles.favoriteText, favorite && styles.favoriteTextActive]}>
            {favorite ? "★ Favorit" : "☆ Als Favorit speichern"}
          </Text>
        </Pressable>

        {recommendation.missingIngredientIds.length > 0 ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Fehlt noch</Text>
            <Text style={styles.muted}>
              {recommendation.missingIngredientIds.map((id) => catalog.require(id).nameDe).join(", ")}
            </Text>
          </View>
        ) : null}

        {recommendation.substitutionLabels.length > 0 ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Möglicher Austausch</Text>
            <Text style={styles.muted}>{recommendation.substitutionLabels.join("\n")}</Text>
          </View>
        ) : null}

        <RecipeMetricsPanel
          servings={pantry.servings}
          ingredients={recommendation.ingredients}
          nutrition={recommendation.nutrition}
        />

        {recommendation.tags.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Passt zu</Text>
            <View style={styles.tags}>
              {recommendation.tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zubereitung</Text>
          {recommendation.instructions.map((instruction, index) => (
            <View key={`${index}-${instruction}`} style={styles.instruction}>
              <Text style={styles.number}>{index + 1}</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wie gefällt dir das?</Text>
          <View style={styles.feedback}>
            {([
              ["liked", "Gefällt mir"],
              ["neutral", "Neutral"],
              ["do_not_suggest", "Nicht mehr vorschlagen"],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: feedback === value }}
                onPress={() => setFeedback(value)}
                style={[styles.feedbackButton, feedback === value && styles.feedbackActive]}
              >
                <Text style={[styles.feedbackText, feedback === value && styles.feedbackTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  center: { alignItems: "center", flex: 1, gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  header: { gap: spacing.xs },
  eyebrow: { color: colors.accent, fontSize: typography.caption, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: typography.hero, fontWeight: "800" },
  availability: { color: colors.accent, fontSize: typography.body, fontWeight: "700" },
  muted: { color: colors.textMuted, fontSize: typography.body, lineHeight: 23 },
  favoriteButton: { alignItems: "center", borderColor: colors.accent, borderRadius: 16, borderWidth: 1, minHeight: 50, justifyContent: "center" },
  favoriteActive: { backgroundColor: colors.accent },
  favoriteText: { color: colors.accent, fontSize: typography.body, fontWeight: "800" },
  favoriteTextActive: { color: colors.onAccent },
  notice: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  noticeTitle: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontWeight: "800" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: { backgroundColor: "#E8F3EC", borderRadius: 999, color: colors.accent, fontSize: 14, fontWeight: "700", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  instruction: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  number: { backgroundColor: colors.accent, borderRadius: 999, color: colors.onAccent, fontWeight: "800", height: 28, lineHeight: 28, textAlign: "center", width: 28 },
  instructionText: { color: colors.text, flex: 1, fontSize: typography.body, lineHeight: 23 },
  feedback: { gap: spacing.sm },
  feedbackButton: { alignItems: "center", borderColor: colors.border, borderRadius: 14, borderWidth: 1, minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.md },
  feedbackActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  feedbackText: { color: colors.text, fontWeight: "700" },
  feedbackTextActive: { color: colors.onAccent },
});
