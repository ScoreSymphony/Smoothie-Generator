import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecommendationCard } from "@/components/RecommendationCard";
import { resolveRecommendationKey } from "@/domain/recommendations";
import { toggleFavoriteRecipe, type UserPreferences } from "@/domain/preferences";
import type { PantryState } from "@/domain/pantry";
import { loadPantryState } from "@/storage/pantryStorage";
import { loadUserPreferences, saveUserPreferences } from "@/storage/preferencesStorage";
import { colors, spacing, typography } from "@/theme/tokens";

export default function FavoritesScreen() {
  const router = useRouter();
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    void Promise.all([loadPantryState(), loadUserPreferences()]).then(([p, prefs]) => {
      setPantry(p);
      setPreferences(prefs);
    });
  }, []);

  const favorites = useMemo(() => {
    if (!pantry || !preferences) return [];
    return preferences.favoriteRecipeKeys
      .map((key) => resolveRecommendationKey(key, pantry, preferences))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [pantry, preferences]);

  if (!pantry || !preferences) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Favoriten</Text>
        {favorites.length === 0 ? (
          <Text style={styles.muted}>Noch keine Smoothies als Favorit gespeichert.</Text>
        ) : favorites.map((item) => (
          <RecommendationCard
            key={item.key}
            recommendation={item}
            favorite
            onOpen={() => router.push({ pathname: "/recipe", params: { key: item.key } })}
            onToggleFavorite={() => {
              const next = toggleFavoriteRecipe(preferences, item.key);
              setPreferences(next);
              void saveUserPreferences(next);
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: typography.hero, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: typography.body, lineHeight: 23 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
});
