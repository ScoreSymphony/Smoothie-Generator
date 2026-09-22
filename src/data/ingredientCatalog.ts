import rawIngredients from "../../data/ingredients.json";

import {
  type Ingredient,
  IngredientValidationError,
  parseIngredientRecord,
} from "@/domain/ingredients";

export function normalizeIngredientTerm(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

export class IngredientCatalog {
  private readonly byId = new Map<string, Ingredient>();
  private readonly lookup = new Map<string, Ingredient>();

  constructor(ingredients: readonly Ingredient[]) {
    for (const ingredient of ingredients) {
      if (this.byId.has(ingredient.id)) {
        throw new IngredientValidationError(
          `Duplicate ingredient id: ${ingredient.id}`,
        );
      }
      this.byId.set(ingredient.id, ingredient);

      for (const term of [
        ingredient.id,
        ingredient.nameDe,
        ...ingredient.aliases,
      ]) {
        const key = normalizeIngredientTerm(term);
        const existing = this.lookup.get(key);
        if (existing && existing.id !== ingredient.id) {
          throw new IngredientValidationError(
            `Duplicate ingredient alias/name "${term}": ${existing.id} vs ${ingredient.id}`,
          );
        }
        this.lookup.set(key, ingredient);
      }
    }
  }

  get size(): number {
    return this.byId.size;
  }

  all(): readonly Ingredient[] {
    return Object.freeze([...this.byId.values()]);
  }

  resolve(value: string): Ingredient | undefined {
    return this.lookup.get(normalizeIngredientTerm(value));
  }

  resolveId(value: string): string | undefined {
    return this.resolve(value)?.id;
  }

  require(value: string): Ingredient {
    const ingredient = this.resolve(value);
    if (!ingredient) {
      throw new IngredientValidationError(`Unknown ingredient: ${value}`);
    }
    return ingredient;
  }
}

export function createIngredientCatalog(payload: unknown): IngredientCatalog {
  if (!Array.isArray(payload)) {
    throw new IngredientValidationError(
      "Ingredient data root must be a JSON array",
    );
  }

  const ingredients = payload.map((record, index) =>
    parseIngredientRecord(record, index),
  );
  return new IngredientCatalog(ingredients);
}

let bundledCatalog: IngredientCatalog | undefined;

export function loadBundledIngredientCatalog(): IngredientCatalog {
  bundledCatalog ??= createIngredientCatalog(rawIngredients);
  return bundledCatalog;
}
