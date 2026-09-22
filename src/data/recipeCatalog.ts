import rawRecipes from "../../data/recipes.json";

import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import {
  type Recipe,
  RecipeValidationError,
  parseRecipeRecord,
} from "@/domain/recipes";

export class RecipeCatalog {
  private readonly byId = new Map<string, Recipe>();

  constructor(recipes: readonly Recipe[]) {
    for (const recipe of recipes) {
      if (this.byId.has(recipe.id)) {
        throw new RecipeValidationError(`Duplicate recipe id: ${recipe.id}`);
      }
      this.byId.set(recipe.id, recipe);
    }
  }

  get size(): number {
    return this.byId.size;
  }

  all(): readonly Recipe[] {
    return Object.freeze([...this.byId.values()]);
  }

  get(id: string): Recipe | undefined {
    return this.byId.get(id);
  }

  require(id: string): Recipe {
    const recipe = this.get(id);
    if (!recipe) {
      throw new RecipeValidationError(`Unknown recipe: ${id}`);
    }
    return recipe;
  }
}

export function createRecipeCatalog(
  payload: unknown,
  ingredients: IngredientCatalog = loadBundledIngredientCatalog(),
): RecipeCatalog {
  if (!Array.isArray(payload)) {
    throw new RecipeValidationError("Recipe data root must be a JSON array");
  }

  return new RecipeCatalog(
    payload.map((record, index) =>
      parseRecipeRecord(record, index, ingredients),
    ),
  );
}

let bundledRecipeCatalog: RecipeCatalog | undefined;

export function loadBundledRecipeCatalog(): RecipeCatalog {
  bundledRecipeCatalog ??= createRecipeCatalog(rawRecipes);
  return bundledRecipeCatalog;
}
