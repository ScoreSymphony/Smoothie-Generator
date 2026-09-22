import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import type { Recipe, RecipeIngredient } from "@/domain/recipes";
import type {
  GeneratedSmoothie,
  GeneratedSmoothieRole,
} from "@/domain/smoothieGenerator";

export const QUANTITY_UNITS = [
  "g",
  "ml",
  "piece",
  "tsp",
  "tbsp",
  "leaf",
  "cube",
] as const;

export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export interface Quantity {
  readonly amount: number;
  readonly unit: QuantityUnit;
}

export interface QuantifiedIngredient {
  readonly ingredientId: string;
  readonly quantity: Quantity;
}

export interface QuantifiedSmoothie {
  readonly servings: number;
  readonly ingredients: readonly QuantifiedIngredient[];
}

export interface QuantifiedRecipe {
  readonly recipeId: string;
  readonly nameDe: string;
  readonly servings: number;
  readonly required: readonly QuantifiedIngredient[];
  readonly optional: readonly QuantifiedIngredient[];
}

export const MIN_RECIPE_SERVINGS = 1;
export const MAX_RECIPE_SERVINGS = 12;

const UNIT_ALIASES: Readonly<Record<string, QuantityUnit>> = Object.freeze({
  g: "g",
  gram: "g",
  gramm: "g",
  ml: "ml",
  milliliter: "ml",
  piece: "piece",
  pieces: "piece",
  "stück": "piece",
  stueck: "piece",
  tsp: "tsp",
  tl: "tsp",
  "teelöffel": "tsp",
  teeloeffel: "tsp",
  tbsp: "tbsp",
  el: "tbsp",
  "esslöffel": "tbsp",
  essloeffel: "tbsp",
  leaf: "leaf",
  leaves: "leaf",
  blatt: "leaf",
  "blätter": "leaf",
  blaetter: "leaf",
  cube: "cube",
  cubes: "cube",
  "würfel": "cube",
  wuerfel: "cube",
});

export const QUANTITY_UNIT_LABELS_DE: Readonly<Record<QuantityUnit, string>> =
  Object.freeze({
    g: "g",
    ml: "ml",
    piece: "Stück",
    tsp: "TL",
    tbsp: "EL",
    leaf: "Blatt",
    cube: "Würfel",
  });

function normalizeUnitText(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

export function normalizeQuantityUnit(value: string | QuantityUnit): QuantityUnit {
  const normalized = normalizeUnitText(value);
  const unit = UNIT_ALIASES[normalized];
  if (!unit) {
    throw new Error(`Unsupported quantity unit: ${value}`);
  }
  return unit;
}

export function createQuantity(
  amount: number,
  unit: string | QuantityUnit,
): Quantity {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Quantity amount must be a positive finite number");
  }

  return Object.freeze({
    amount,
    unit: normalizeQuantityUnit(unit),
  });
}

export function quantityLabelDe(quantity: Quantity): string {
  return `${formatQuantityAmount(quantity.amount)} ${QUANTITY_UNIT_LABELS_DE[quantity.unit]}`;
}

export function formatQuantityAmount(amount: number): string {
  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount
    .toFixed(amount < 5 ? 2 : 1)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1")
    .replace(".", ",");
}

function roundAmount(value: number): number {
  if (value >= 20) {
    return Math.round(value);
  }
  if (value >= 5) {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value * 100) / 100;
}

function validateServings(servings: number): void {
  if (
    !Number.isInteger(servings) ||
    servings < MIN_RECIPE_SERVINGS ||
    servings > MAX_RECIPE_SERVINGS
  ) {
    throw new Error(
      `servings must be an integer from ${MIN_RECIPE_SERVINGS} to ${MAX_RECIPE_SERVINGS}`,
    );
  }
}

function roleFraction(
  role: GeneratedSmoothieRole,
  category: string,
): number {
  switch (role) {
    case "main_fruit":
      return 0.5;
    case "liquid":
      return 0.65;
    case "creamy_base":
      return 0.5;
    case "protein":
      return 0.45;
    case "sweetener":
      return 0.2;
    case "extra":
      if (category === "spices") {
        return 0.1;
      }
      if (category === "greens") {
        return 0.45;
      }
      if (category === "seeds") {
        return 0.3;
      }
      return 0.3;
  }
}

function oneServingGeneratedQuantity(
  ingredientId: string,
  role: GeneratedSmoothieRole,
  catalog: IngredientCatalog,
): Quantity {
  const ingredient = catalog.require(ingredientId);
  const range = ingredient.typicalAmount;
  const fraction = roleFraction(role, ingredient.category);
  const amount =
    range.minimum + (range.maximum - range.minimum) * fraction;
  const bounded = Math.min(range.maximum, Math.max(range.minimum, amount));

  return createQuantity(roundAmount(bounded), range.unit);
}

export function quantifyGeneratedSmoothie(
  candidate: GeneratedSmoothie,
  servings = 1,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): QuantifiedSmoothie {
  validateServings(servings);

  const roleByIngredient = new Map(
    candidate.roles.map((assignment) => [
      assignment.ingredientId,
      assignment.role,
    ]),
  );

  const measured = candidate.ingredientIds.map((ingredientId) => {
    const role = roleByIngredient.get(ingredientId);
    if (!role) {
      throw new Error(
        `Generated candidate is missing a role for ingredient: ${ingredientId}`,
      );
    }

    const oneServing = oneServingGeneratedQuantity(
      ingredientId,
      role,
      catalog,
    );

    return Object.freeze({
      ingredientId,
      quantity: createQuantity(
        roundAmount(oneServing.amount * servings),
        oneServing.unit,
      ),
    });
  });

  return Object.freeze({
    servings,
    ingredients: Object.freeze(measured),
  });
}

function quantifyStoredItem(
  item: RecipeIngredient,
  servings: number,
): QuantifiedIngredient {
  return Object.freeze({
    ingredientId: item.ingredientId,
    quantity: createQuantity(
      roundAmount(item.amount * servings),
      item.unit,
    ),
  });
}

export function quantifyStoredRecipe(
  recipe: Recipe,
  servings = 1,
): QuantifiedRecipe {
  validateServings(servings);

  return Object.freeze({
    recipeId: recipe.id,
    nameDe: recipe.nameDe,
    servings,
    required: Object.freeze(
      recipe.required.map((item) => quantifyStoredItem(item, servings)),
    ),
    optional: Object.freeze(
      recipe.optional.map((item) => quantifyStoredItem(item, servings)),
    ),
  });
}
