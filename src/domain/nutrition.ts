import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import type {
  QuantifiedIngredient,
  Quantity,
} from "@/domain/quantities";

export interface NutritionFacts {
  readonly calories: number;
  readonly proteinG: number;
  readonly carbohydratesG: number;
  readonly sugarG: number;
  readonly fatG: number;
  readonly fiberG: number;
}

export const EMPTY_NUTRITION_FACTS: NutritionFacts = Object.freeze({
  calories: 0,
  proteinG: 0,
  carbohydratesG: 0,
  sugarG: 0,
  fatG: 0,
  fiberG: 0,
});

export class NutritionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NutritionValidationError";
  }
}

export function addNutritionFacts(
  left: NutritionFacts,
  right: NutritionFacts,
): NutritionFacts {
  return Object.freeze({
    calories: left.calories + right.calories,
    proteinG: left.proteinG + right.proteinG,
    carbohydratesG: left.carbohydratesG + right.carbohydratesG,
    sugarG: left.sugarG + right.sugarG,
    fatG: left.fatG + right.fatG,
    fiberG: left.fiberG + right.fiberG,
  });
}

export function scaleNutritionFacts(
  facts: NutritionFacts,
  factor: number,
): NutritionFacts {
  if (!Number.isFinite(factor) || factor < 0) {
    throw new Error("Nutrition scale factor must be finite and non-negative");
  }

  return Object.freeze({
    calories: facts.calories * factor,
    proteinG: facts.proteinG * factor,
    carbohydratesG: facts.carbohydratesG * factor,
    sugarG: facts.sugarG * factor,
    fatG: facts.fatG * factor,
    fiberG: facts.fiberG * factor,
  });
}

export function roundNutritionFacts(
  facts: NutritionFacts,
  digits = 1,
): NutritionFacts {
  if (!Number.isInteger(digits) || digits < 0 || digits > 4) {
    throw new Error("Nutrition rounding digits must be an integer from 0 to 4");
  }

  const factor = 10 ** digits;
  const round = (value: number) => Math.round(value * factor) / factor;

  return Object.freeze({
    calories: round(facts.calories),
    proteinG: round(facts.proteinG),
    carbohydratesG: round(facts.carbohydratesG),
    sugarG: round(facts.sugarG),
    fatG: round(facts.fatG),
    fiberG: round(facts.fiberG),
  });
}

function typicalWeightGrams(
  ingredientId: string,
  catalog: IngredientCatalog,
): number {
  const ingredient = catalog.require(ingredientId);
  const range = ingredient.typicalAmount;

  if (normalizeMassUnit(range.unit) === "g") {
    return (range.minimum + range.maximum) / 2;
  }

  return 100;
}

function normalizeMassUnit(unit: string): "g" | "other" {
  return unit.trim().toLocaleLowerCase("de-DE") === "g" ? "g" : "other";
}

export function quantityToApproximateGrams(
  ingredientId: string,
  quantity: Quantity,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): number {
  switch (quantity.unit) {
    case "g":
      return quantity.amount;
    case "ml":
      return quantity.amount;
    case "piece":
      return quantity.amount * typicalWeightGrams(ingredientId, catalog);
    case "tsp":
      return quantity.amount * 5;
    case "tbsp":
      return quantity.amount * 15;
    case "leaf":
      return quantity.amount;
    case "cube":
      return quantity.amount * 30;
  }
}

export interface NutritionCatalogLike {
  readonly size: number;
  require(ingredientId: string): NutritionFacts;
}

export function calculateNutrition(
  items: readonly QuantifiedIngredient[],
  nutritionCatalog: NutritionCatalogLike,
  ingredientCatalog: IngredientCatalog = loadBundledIngredientCatalog(),
): NutritionFacts {
  let total = EMPTY_NUTRITION_FACTS;

  for (const item of items) {
    const grams = quantityToApproximateGrams(
      item.ingredientId,
      item.quantity,
      ingredientCatalog,
    );
    const per100g = nutritionCatalog.require(item.ingredientId);
    total = addNutritionFacts(
      total,
      scaleNutritionFacts(per100g, grams / 100),
    );
  }

  return total;
}
