import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecommendationCard } from "@/components/RecommendationCard";
import { buildRecommendations } from "@/domain/recommendations";
import { toggleFavoriteRecipe, type UserPreferences } from "@/domain/preferences";
import type { PantryState } from "@/domain/pantry";
import { loadPantryState } from "@/storage/pantryStorage";
import { loadUserPreferences, saveUserPreferences } from "@/storage/preferencesStorage";
import { colors, spacing, typography } from "@/theme/tokens";

export default function SuggestionsScreen() {
  const router = useRouter();
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([loadPantryState(), loadUserPreferences()])
      .then(([storedPantry, storedPreferences]) => {
        if (!active) return;
        setPantry(storedPantry);
        setPreferences(storedPreferences);
      })
      .catch(() => active && setError("Die Empfehlungen konnten nicht geladen werden."));
    return () => { active = false; };
  }, []);

  const recommendations = useMemo(
    () => pantry && preferences ? buildRecommendations(pantry, preferences, 17, page) : [],
    [pantry, preferences, page],
  );

  const nextRecommendations = useMemo(
    () => pantry && preferences ? buildRecommendations(pantry, preferences, 17, page + 1) : [],
    [pantry, preferences, page],
  );

  const hasAlternativeRecommendations =
    recommendations.map((item) => item.key).join("|") !==
    nextRecommendations.map((item) => item.key).join("|");

  const showOtherCombinations = () => {
    setPage((current) => current + 1);
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  };

  const toggleFavorite = (key: string) => {
    if (!preferences) return;
    const next = toggleFavoriteRecipe(preferences, key);
    setPreferences(next);
    void saveUserPreferences(next).catch(() =>
      setError("Der Favorit konnte nicht gespeichert werden."),
    );
  };

  if (!pantry || !preferences) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.muted}>Empfehlungen werden vorbereitet …</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Deine Smoothies</Text>
          <Text style={styles.muted}>
            Gespeicherte Rezepte und neue Kombinationen aus deinem Vorrat.
          </Text>
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {recommendations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.sectionTitle}>Noch keine passende Kombination</Text>
            <Text style={styles.muted}>
              Wähle mindestens eine Frucht und eine Flüssigkeit aus.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/pantry")} style={styles.primary}>
              <Text style={styles.primaryText}>Zutaten anpassen</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.list}>
              {recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.key}
                  recommendation={recommendation}
                  favorite={preferences.favoriteRecipeKeys.includes(recommendation.key)}
                  onOpen={() => router.push({ pathname: "/recipe", params: { key: recommendation.key } })}
                  onToggleFavorite={() => toggleFavorite(recommendation.key)}
                />
              ))}
            </View>
            {hasAlternativeRecommendations ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Andere Smoothie-Kombinationen erzeugen"
                onPress={showOtherCombinations}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Andere Kombinationen</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: typography.hero, fontWeight: "800" },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: typography.body, lineHeight: 23 },
  list: { gap: spacing.md },
  center: { alignItems: "center", flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.lg },
  empty: { backgroundColor: colors.surface, borderRadius: 20, gap: spacing.md, padding: spacing.lg },
  error: { backgroundColor: "#FFF2CC", borderRadius: 12, color: colors.text, padding: spacing.md },
  primary: { alignItems: "center", backgroundColor: colors.accent, borderRadius: 16, minHeight: 50, justifyContent: "center", paddingHorizontal: spacing.lg },
  primaryText: { color: colors.onAccent, fontSize: typography.body, fontWeight: "800" },
  secondary: { alignItems: "center", borderColor: colors.accent, borderRadius: 16, borderWidth: 1, minHeight: 50, justifyContent: "center", paddingHorizontal: spacing.lg },
  secondaryText: { color: colors.accent, fontSize: typography.body, fontWeight: "800" },
});
