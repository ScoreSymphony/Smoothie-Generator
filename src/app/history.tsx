import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecommendationCard } from "@/components/RecommendationCard";
import { resolveRecommendationKey } from "@/domain/recommendations";
import type { PantryState } from "@/domain/pantry";
import type { UserPreferences } from "@/domain/preferences";
import { clearRecipeHistory, loadRecipeHistory, type HistoryEntry } from "@/storage/historyStorage";
import { loadPantryState } from "@/storage/pantryStorage";
import { loadUserPreferences } from "@/storage/preferencesStorage";
import { colors, spacing, typography } from "@/theme/tokens";

export default function HistoryScreen() {
  const router = useRouter();
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [history, setHistory] = useState<readonly HistoryEntry[] | null>(null);

  useEffect(() => {
    void Promise.all([loadPantryState(), loadUserPreferences(), loadRecipeHistory()])
      .then(([p, prefs, entries]) => {
        setPantry(p);
        setPreferences(prefs);
        setHistory(entries);
      });
  }, []);

  const rows = useMemo(() => {
    if (!pantry || !preferences || !history) return [];
    return history
      .map((entry) => ({
        entry,
        recommendation: resolveRecommendationKey(entry.recipeKey, pantry, preferences),
      }))
      .filter((row): row is typeof row & { recommendation: NonNullable<typeof row.recommendation> } =>
        Boolean(row.recommendation),
      );
  }, [history, pantry, preferences]);

  if (!pantry || !preferences || !history) {
    return <SafeAreaView edges={["bottom"]} style={styles.safeArea}><View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Verlauf</Text>
          {history.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => {
              void clearRecipeHistory();
              setHistory([]);
            }} style={styles.clearButton}>
              <Text style={styles.clearText}>Leeren</Text>
            </Pressable>
          ) : null}
        </View>

        {rows.length === 0 ? (
          <Text style={styles.muted}>Noch keine Rezepte angesehen.</Text>
        ) : rows.map(({ entry, recommendation }) => (
          <View key={entry.recipeKey} style={styles.row}>
            <Text style={styles.date}>
              {new Date(entry.viewedAt).toLocaleDateString("de-DE")}
            </Text>
            <RecommendationCard
              recommendation={recommendation}
              onOpen={() => router.push({ pathname: "/recipe", params: { key: recommendation.key } })}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: typography.hero, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: typography.body },
  row: { gap: spacing.xs },
  date: { color: colors.textMuted, fontSize: typography.caption, fontWeight: "700" },
  clearButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  clearText: { color: colors.accent, fontWeight: "800" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
});
