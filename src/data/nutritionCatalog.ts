import rawNutrition from "../../data/nutrition.json";

import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import {
  type NutritionCatalogLike,
  type NutritionFacts,
  NutritionValidationError,
} from "@/domain/nutrition";

const REQUIRED_FIELDS = [
  "calories",
  "protein_g",
  "carbohydrates_g",
  "sugar_g",
  "fat_g",
  "fiber_g",
] as const;

function parseNutritionFacts(
  value: unknown,
  ingredientId: string,
): NutritionFacts {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new NutritionValidationError(
      `Nutrition entry for ${ingredientId} must be an object`,
    );
  }

  const record = value as Record<string, unknown>;
  const parsed: Record<string, number> = {};

  for (const field of REQUIRED_FIELDS) {
    const rawValue = record[field];
    if (
      typeof rawValue !== "number" ||
      !Number.isFinite(rawValue) ||
      rawValue < 0
    ) {
      throw new NutritionValidationError(
        `Invalid nutrition value for ${ingredientId}.${field}`,
      );
    }
    parsed[field] = rawValue;
  }

  return Object.freeze({
    calories: parsed.calories,
    proteinG: parsed.protein_g,
    carbohydratesG: parsed.carbohydrates_g,
    sugarG: parsed.sugar_g,
    fatG: parsed.fat_g,
    fiberG: parsed.fiber_g,
  });
}

export class NutritionCatalog implements NutritionCatalogLike {
  private readonly entries: ReadonlyMap<string, NutritionFacts>;

  constructor(entries: ReadonlyMap<string, NutritionFacts>) {
    this.entries = new Map(entries);
  }

  get size(): number {
    return this.entries.size;
  }

  get(ingredientId: string): NutritionFacts | undefined {
    return this.entries.get(ingredientId);
  }

  require(ingredientId: string): NutritionFacts {
    const facts = this.get(ingredientId);
    if (!facts) {
      throw new NutritionValidationError(
        `Missing nutrition data for ingredient: ${ingredientId}`,
      );
    }
    return facts;
  }
}

export function createNutritionCatalog(
  payload: unknown,
  ingredients: IngredientCatalog = loadBundledIngredientCatalog(),
): NutritionCatalog {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new NutritionValidationError(
      "Nutrition data root must be an object",
    );
  }

  const root = payload as Record<string, unknown>;
  const rawEntries = root.ingredients;
  if (
    typeof rawEntries !== "object" ||
    rawEntries === null ||
    Array.isArray(rawEntries)
  ) {
    throw new NutritionValidationError(
      "Nutrition data must contain an ingredients object",
    );
  }

  const knownIds = new Set(ingredients.all().map((ingredient) => ingredient.id));
  const entries = new Map<string, NutritionFacts>();

  for (const [ingredientId, value] of Object.entries(rawEntries)) {
    if (!knownIds.has(ingredientId)) {
      throw new NutritionValidationError(
        `Nutrition data contains unknown ingredient: ${ingredientId}`,
      );
    }
    entries.set(ingredientId, parseNutritionFacts(value, ingredientId));
  }

  const missing = [...knownIds].filter((id) => !entries.has(id));
  if (missing.length > 0) {
    throw new NutritionValidationError(
      `Nutrition data missing ingredient ids: ${missing.join(", ")}`,
    );
  }

  return new NutritionCatalog(entries);
}

let bundledNutritionCatalog: NutritionCatalog | undefined;

export function loadBundledNutritionCatalog(): NutritionCatalog {
  bundledNutritionCatalog ??= createNutritionCatalog(rawNutrition);
  return bundledNutritionCatalog;
}
