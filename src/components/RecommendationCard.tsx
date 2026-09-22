import { Pressable, StyleSheet, Text, View } from "react-native";

import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import type { RecommendationView } from "@/domain/recommendations";
import { colors, spacing, typography } from "@/theme/tokens";

export interface RecommendationCardProps {
  readonly recommendation: RecommendationView;
  readonly favorite?: boolean;
  readonly onOpen: () => void;
  readonly onToggleFavorite?: () => void;
}

export function RecommendationCard({
  recommendation,
  favorite = false,
  onOpen,
  onToggleFavorite,
}: RecommendationCardProps) {
  const catalog = loadBundledIngredientCatalog();
  const ingredientNames = recommendation.ingredientIds
    .slice(0, 4)
    .map((id) => catalog.require(id).nameDe)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${recommendation.title} öffnen`}
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.source}>
            {recommendation.source === "stored" ? "REZEPT" : "NEU KOMBINIERT"}
          </Text>
          <Text style={styles.title}>{recommendation.title}</Text>
        </View>
        {onToggleFavorite ? (
          <Pressable
            accessibilityLabel={
              favorite
                ? `${recommendation.title} aus Favoriten entfernen`
                : `${recommendation.title} zu Favoriten hinzufügen`
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            style={styles.favoriteButton}
          >
            <Text style={styles.favoriteText}>{favorite ? "★" : "☆"}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.availability}>{recommendation.availabilityLabel}</Text>
      <Text numberOfLines={2} style={styles.ingredients}>{ingredientNames}</Text>
      {recommendation.substitutionLabels.length > 0 ? (
        <Text style={styles.note}>
          Austausch: {recommendation.substitutionLabels.join(", ")}
        </Text>
      ) : null}
      <View style={styles.bottomRow}>
        <Text style={styles.nutrition}>
          ca. {Math.round(recommendation.nutrition.calories)} kcal ·{" "}
          {Math.round(recommendation.nutrition.proteinG * 10) / 10} g Protein
        </Text>
        <Text style={styles.open}>Details ›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.78 },
  topRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  titleBlock: { flex: 1, gap: 3 },
  source: { color: colors.accent, fontSize: typography.caption, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: typography.heading, fontWeight: "800" },
  favoriteButton: { alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44 },
  favoriteText: { color: colors.accent, fontSize: 28 },
  availability: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  ingredients: { color: colors.text, fontSize: typography.body, lineHeight: 22 },
  note: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  bottomRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  nutrition: { color: colors.textMuted, flex: 1, fontSize: typography.caption },
  open: { color: colors.accent, fontSize: 14, fontWeight: "800" },
});
