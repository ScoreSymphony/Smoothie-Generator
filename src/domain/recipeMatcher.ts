import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import {
  loadBundledRecipeCatalog,
  type RecipeCatalog,
} from "@/data/recipeCatalog";
import { availableIngredientIds, type PantryState } from "@/domain/pantry";
import type {
  Recipe,
  RecipeIngredient,
  RecipeSubstitutionGroup,
} from "@/domain/recipes";

export type RecipeMatchKind = "exact" | "substitution" | "partial";

export interface RecipeSubstitutionUse {
  readonly targetId: string;
  readonly alternativeId: string;
}

export interface RecipeMatch {
  readonly recipe: Recipe;
  readonly kind: RecipeMatchKind;
  readonly availabilityScore: number;
  readonly directRequiredCount: number;
  readonly substitutedRequiredCount: number;
  readonly missingRequired: readonly RecipeIngredient[];
  readonly substitutionsUsed: readonly RecipeSubstitutionUse[];
  readonly availableOptional: readonly RecipeIngredient[];
}

export interface MatchStoredRecipeOptions {
  readonly limit?: number;
  readonly includeZeroMatches?: boolean;
}

const SUBSTITUTION_WEIGHT = 0.9;

function substitutionByTarget(
  recipe: Recipe,
): ReadonlyMap<string, RecipeSubstitutionGroup> {
  return new Map(recipe.substitutions.map((group) => [group.targetId, group]));
}

function canonicalAvailableSet(
  values: readonly string[],
  ingredients: IngredientCatalog,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const value of values) {
    const id = ingredients.resolveId(value);
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}

export function matchRecipe(
  recipe: Recipe,
  availableIngredients: readonly string[],
  ingredients: IngredientCatalog = loadBundledIngredientCatalog(),
): RecipeMatch {
  const available = canonicalAvailableSet(availableIngredients, ingredients);
  const substitutionGroups = substitutionByTarget(recipe);

  let directRequiredCount = 0;
  let substitutedRequiredCount = 0;
  const missingRequired: RecipeIngredient[] = [];
  const substitutionsUsed: RecipeSubstitutionUse[] = [];

  for (const requirement of recipe.required) {
    if (available.has(requirement.ingredientId)) {
      directRequiredCount += 1;
      continue;
    }

    const substitution = substitutionGroups.get(requirement.ingredientId);
    const alternative = substitution?.alternatives.find((id) =>
      available.has(id),
    );

    if (alternative) {
      substitutedRequiredCount += 1;
      substitutionsUsed.push(
        Object.freeze({
          targetId: requirement.ingredientId,
          alternativeId: alternative,
        }),
      );
    } else {
      missingRequired.push(requirement);
    }
  }

  const weightedRequired =
    directRequiredCount + substitutedRequiredCount * SUBSTITUTION_WEIGHT;
  const availabilityScore =
    recipe.required.length === 0
      ? 0
      : weightedRequired / recipe.required.length;

  const kind: RecipeMatchKind =
    missingRequired.length > 0
      ? "partial"
      : substitutedRequiredCount > 0
        ? "substitution"
        : "exact";

  const availableOptional = recipe.optional.filter((ingredient) =>
    available.has(ingredient.ingredientId),
  );

  return Object.freeze({
    recipe,
    kind,
    availabilityScore,
    directRequiredCount,
    substitutedRequiredCount,
    missingRequired: Object.freeze(missingRequired),
    substitutionsUsed: Object.freeze(substitutionsUsed),
    availableOptional: Object.freeze(availableOptional),
  });
}

const KIND_RANK: Readonly<Record<RecipeMatchKind, number>> = {
  exact: 3,
  substitution: 2,
  partial: 1,
};

function compareRecipeMatches(a: RecipeMatch, b: RecipeMatch): number {
  const kindDifference = KIND_RANK[b.kind] - KIND_RANK[a.kind];
  if (kindDifference !== 0) {
    return kindDifference;
  }

  const scoreDifference = b.availabilityScore - a.availabilityScore;
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const directDifference = b.directRequiredCount - a.directRequiredCount;
  if (directDifference !== 0) {
    return directDifference;
  }

  const optionalDifference =
    b.availableOptional.length - a.availableOptional.length;
  if (optionalDifference !== 0) {
    return optionalDifference;
  }

  const missingDifference =
    a.missingRequired.length - b.missingRequired.length;
  if (missingDifference !== 0) {
    return missingDifference;
  }

  return a.recipe.id < b.recipe.id ? -1 : a.recipe.id > b.recipe.id ? 1 : 0;
}

export function rankStoredRecipes(
  availableIngredients: readonly string[],
  options: MatchStoredRecipeOptions = {},
  recipes: RecipeCatalog = loadBundledRecipeCatalog(),
  ingredients: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly RecipeMatch[] {
  const includeZeroMatches = options.includeZeroMatches ?? false;
  const requestedLimit = options.limit;
  const limit =
    requestedLimit === undefined
      ? undefined
      : Math.max(0, Math.floor(requestedLimit));

  const ranked = recipes
    .all()
    .map((recipe) => matchRecipe(recipe, availableIngredients, ingredients))
    .filter(
      (match) =>
        includeZeroMatches ||
        match.directRequiredCount + match.substitutedRequiredCount > 0,
    )
    .sort(compareRecipeMatches);

  return Object.freeze(
    limit === undefined ? ranked : ranked.slice(0, limit),
  );
}

export function matchStoredRecipesForPantry(
  pantry: PantryState,
  options: MatchStoredRecipeOptions = {},
  recipes: RecipeCatalog = loadBundledRecipeCatalog(),
  ingredients: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly RecipeMatch[] {
  return rankStoredRecipes(
    availableIngredientIds(pantry),
    options,
    recipes,
    ingredients,
  );
}
