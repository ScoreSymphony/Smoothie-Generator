import { StyleSheet, Text, View } from "react-native";

import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import type { NutritionFacts } from "@/domain/nutrition";
import {
  quantityLabelDe,
  type QuantifiedIngredient,
} from "@/domain/quantities";
import { colors, spacing, typography } from "@/theme/tokens";

export interface RecipeMetricsPanelProps {
  readonly servings: number;
  readonly ingredients: readonly QuantifiedIngredient[];
  readonly nutrition: NutritionFacts;
}

function formatNutritionValue(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return `${text} ${unit}`;
}

export function RecipeMetricsPanel({
  servings,
  ingredients,
  nutrition,
}: RecipeMetricsPanelProps) {
  const catalog = loadBundledIngredientCatalog();

  const nutritionRows = [
    ["Kalorien", formatNutritionValue(nutrition.calories, "kcal")],
    ["Protein", formatNutritionValue(nutrition.proteinG, "g")],
    [
      "Kohlenhydrate",
      formatNutritionValue(nutrition.carbohydratesG, "g"),
    ],
    ["Zucker", formatNutritionValue(nutrition.sugarG, "g")],
    ["Fett", formatNutritionValue(nutrition.fatG, "g")],
    ["Ballaststoffe", formatNutritionValue(nutrition.fiberG, "g")],
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.heading}>
          Mengen für {servings} {servings === 1 ? "Portion" : "Portionen"}
        </Text>
        {ingredients.map((item) => (
          <View key={item.ingredientId} style={styles.row}>
            <Text style={styles.label}>
              {catalog.require(item.ingredientId).nameDe}
            </Text>
            <Text style={styles.value}>{quantityLabelDe(item.quantity)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Nährwerte gesamt (ca.)</Text>
        {nutritionRows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  heading: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "700",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 36,
  },
  label: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
  },
  value: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
