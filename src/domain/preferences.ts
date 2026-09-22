import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import {
  rankGeneratedCandidates,
  type CandidateScore,
  type RankGeneratedCandidateOptions,
  type ScoringContext,
  type ScoringGoal,
} from "@/domain/candidateScoring";
import type { RecipeMatch, RecipeMatchKind } from "@/domain/recipeMatcher";
import type { Recipe } from "@/domain/recipes";
import {
  generateSmoothies,
  type GeneratedSmoothie,
  type SmoothieGenerationOptions,
} from "@/domain/smoothieGenerator";

export const FEEDBACK_VALUES = [
  "liked",
  "neutral",
  "do_not_suggest",
] as const;

export type FeedbackValue = (typeof FEEDBACK_VALUES)[number];

export interface UserPreferences {
  readonly favoriteIngredientIds: readonly string[];
  readonly favoriteRecipeKeys: readonly string[];
  readonly excludedIngredientIds: readonly string[];
  readonly allergies: readonly string[];
  readonly vegan: boolean;
  readonly vegetarian: boolean;
  readonly dairyFree: boolean;
  readonly desiredSweetness: number | null;
  readonly desiredCreaminess: number | null;
  readonly refreshing: boolean;
  readonly filling: boolean;
  readonly proteinRich: boolean;
  readonly lowerCalorie: boolean;
  readonly breakfast: boolean;
  readonly postWorkout: boolean;
  readonly feedback: Readonly<Record<string, FeedbackValue>>;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = Object.freeze({
  favoriteIngredientIds: Object.freeze([]),
  favoriteRecipeKeys: Object.freeze([]),
  excludedIngredientIds: Object.freeze([]),
  allergies: Object.freeze([]),
  vegan: false,
  vegetarian: false,
  dairyFree: false,
  desiredSweetness: null,
  desiredCreaminess: null,
  refreshing: false,
  filling: false,
  proteinRich: false,
  lowerCalorie: false,
  breakfast: false,
  postWorkout: false,
  feedback: Object.freeze({}),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }

  return Object.freeze([
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]);
}

function canonicalIngredientIds(
  value: unknown,
  catalog: IngredientCatalog,
): readonly string[] {
  const result: string[] = [];

  for (const item of uniqueStrings(value)) {
    const id = catalog.resolveId(item);
    if (id && !result.includes(id)) {
      result.push(id);
    }
  }

  return Object.freeze(result);
}

function preferenceScale(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 5
    ? value
    : null;
}

function sanitizeFeedback(value: unknown): Readonly<Record<string, FeedbackValue>> {
  if (!isRecord(value)) {
    return Object.freeze({});
  }

  const result: Record<string, FeedbackValue> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (
      key.trim() &&
      typeof rawValue === "string" &&
      FEEDBACK_VALUES.includes(rawValue as FeedbackValue)
    ) {
      result[key] = rawValue as FeedbackValue;
    }
  }

  return Object.freeze(result);
}

export function sanitizeUserPreferences(
  value: unknown,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): UserPreferences {
  if (!isRecord(value)) {
    return DEFAULT_USER_PREFERENCES;
  }

  return Object.freeze({
    favoriteIngredientIds: canonicalIngredientIds(
      value.favoriteIngredientIds ?? value.favorite_ingredients,
      catalog,
    ),
    favoriteRecipeKeys: uniqueStrings(
      value.favoriteRecipeKeys ?? value.favorite_recipes,
    ),
    excludedIngredientIds: canonicalIngredientIds(
      value.excludedIngredientIds ?? value.excluded_ingredients,
      catalog,
    ),
    allergies: uniqueStrings(value.allergies),
    vegan: value.vegan === true,
    vegetarian: value.vegetarian === true,
    dairyFree: value.dairyFree === true || value.dairy_free === true,
    desiredSweetness: preferenceScale(
      value.desiredSweetness ?? value.desired_sweetness,
    ),
    desiredCreaminess: preferenceScale(
      value.desiredCreaminess ?? value.desired_creaminess,
    ),
    refreshing: value.refreshing === true,
    filling: value.filling === true,
    proteinRich: value.proteinRich === true || value.protein_rich === true,
    lowerCalorie:
      value.lowerCalorie === true || value.lower_calorie === true,
    breakfast: value.breakfast === true,
    postWorkout: value.postWorkout === true || value.post_workout === true,
    feedback: sanitizeFeedback(value.feedback),
  });
}

export function generatedFeedbackKey(candidate: GeneratedSmoothie): string {
  return `generated:${[...candidate.ingredientIds].sort().join(",")}`;
}

export function storedFeedbackKey(recipe: Recipe | string): string {
  return `stored:${typeof recipe === "string" ? recipe : recipe.id}`;
}

export function ingredientAllowedByPreferences(
  ingredientId: string,
  preferences: UserPreferences,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): boolean {
  const ingredient = catalog.require(ingredientId);

  if (preferences.excludedIngredientIds.includes(ingredient.id)) {
    return false;
  }
  if (preferences.vegan && !ingredient.vegan) {
    return false;
  }
  if (preferences.dairyFree && ingredient.allergens.includes("milk")) {
    return false;
  }
  if (
    ingredient.allergens.some((allergen) =>
      preferences.allergies.includes(allergen),
    )
  ) {
    return false;
  }

  return true;
}

export function filterPantryByPreferences(
  pantryIds: readonly string[],
  preferences: UserPreferences,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly string[] {
  const result: string[] = [];

  for (const value of pantryIds) {
    const ingredient = catalog.resolve(value);
    if (
      ingredient &&
      !result.includes(ingredient.id) &&
      ingredientAllowedByPreferences(ingredient.id, preferences, catalog)
    ) {
      result.push(ingredient.id);
    }
  }

  return Object.freeze(result);
}

export function candidateAllowedByPreferences(
  candidate: GeneratedSmoothie,
  preferences: UserPreferences,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): boolean {
  if (
    preferences.feedback[generatedFeedbackKey(candidate)] === "do_not_suggest"
  ) {
    return false;
  }

  return candidate.ingredientIds.every((ingredientId) =>
    ingredientAllowedByPreferences(ingredientId, preferences, catalog),
  );
}

export function recipeAllowedByPreferences(
  recipe: Recipe,
  preferences: UserPreferences,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): boolean {
  if (preferences.feedback[storedFeedbackKey(recipe)] === "do_not_suggest") {
    return false;
  }

  return recipe.required.every((item) =>
    ingredientAllowedByPreferences(item.ingredientId, preferences, catalog),
  );
}

export function scoringContextFromPreferences(
  preferences: UserPreferences,
  pantryIds: readonly string[],
): ScoringContext {
  const goals: ScoringGoal[] = [];

  if (preferences.refreshing) goals.push("refreshing");
  if (preferences.filling) goals.push("filling");
  if (preferences.proteinRich) goals.push("protein_rich");
  if (preferences.lowerCalorie) goals.push("lower_calorie");
  if (preferences.breakfast) goals.push("breakfast");
  if (preferences.postWorkout) goals.push("post_workout");

  const likedCandidateKeys = Object.entries(preferences.feedback)
    .filter(
      ([key, value]) => key.startsWith("generated:") && value === "liked",
    )
    .map(([key]) => key);

  for (const key of preferences.favoriteRecipeKeys) {
    if (key.startsWith("generated:") && !likedCandidateKeys.includes(key)) {
      likedCandidateKeys.push(key);
    }
  }

  return Object.freeze({
    pantryIngredientIds: Object.freeze([...pantryIds]),
    preferredIngredientIds: preferences.favoriteIngredientIds,
    desiredSweetness: preferences.desiredSweetness ?? undefined,
    desiredCreaminess: preferences.desiredCreaminess ?? undefined,
    goals: Object.freeze(goals),
    likedCandidateKeys: Object.freeze(likedCandidateKeys),
  });
}

export function withFeedback(
  preferences: UserPreferences,
  recipeKey: string,
  value: FeedbackValue,
): UserPreferences {
  if (!recipeKey.trim()) {
    throw new Error("recipeKey must not be empty");
  }

  return Object.freeze({
    ...preferences,
    feedback: Object.freeze({
      ...preferences.feedback,
      [recipeKey]: value,
    }),
  });
}

export function clearPreferenceFeedback(
  preferences: UserPreferences,
): UserPreferences {
  return Object.freeze({
    ...preferences,
    feedback: Object.freeze({}),
  });
}

export function toggleFavoriteIngredient(
  preferences: UserPreferences,
  ingredientId: string,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): UserPreferences {
  const canonical = catalog.resolveId(ingredientId);
  if (!canonical) {
    return preferences;
  }

  const active = preferences.favoriteIngredientIds.includes(canonical);
  return Object.freeze({
    ...preferences,
    favoriteIngredientIds: Object.freeze(
      active
        ? preferences.favoriteIngredientIds.filter((id) => id !== canonical)
        : [...preferences.favoriteIngredientIds, canonical],
    ),
  });
}

export function toggleFavoriteRecipe(
  preferences: UserPreferences,
  recipeKey: string,
): UserPreferences {
  if (!recipeKey.trim()) {
    return preferences;
  }

  const active = preferences.favoriteRecipeKeys.includes(recipeKey);
  return Object.freeze({
    ...preferences,
    favoriteRecipeKeys: Object.freeze(
      active
        ? preferences.favoriteRecipeKeys.filter((key) => key !== recipeKey)
        : [...preferences.favoriteRecipeKeys, recipeKey],
    ),
  });
}

function excludedIdsForGeneration(
  preferences: UserPreferences,
  catalog: IngredientCatalog,
): readonly string[] {
  const ids = new Set(preferences.excludedIngredientIds);

  if (preferences.dairyFree) {
    for (const ingredient of catalog.all()) {
      if (ingredient.allergens.includes("milk")) {
        ids.add(ingredient.id);
      }
    }
  }

  return Object.freeze([...ids]);
}

export function generateSmoothiesWithPreferences(
  pantryIds: readonly string[],
  preferences: UserPreferences,
  options: SmoothieGenerationOptions = {},
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly GeneratedSmoothie[] {
  const requestedCount = Math.max(0, Math.floor(options.count ?? 5));
  if (requestedCount === 0) {
    return Object.freeze([]);
  }

  const filteredPantry = filterPantryByPreferences(
    pantryIds,
    preferences,
    catalog,
  );
  const candidates = generateSmoothies(
    filteredPantry,
    {
      ...options,
      count: Math.max(requestedCount, requestedCount * 3),
      vegan: preferences.vegan || options.vegan === true,
      excludedAllergens: Object.freeze([
        ...new Set([
          ...(options.excludedAllergens ?? []),
          ...preferences.allergies,
        ]),
      ]),
      excludedIngredientIds: Object.freeze([
        ...new Set([
          ...(options.excludedIngredientIds ?? []),
          ...excludedIdsForGeneration(preferences, catalog),
        ]),
      ]),
    },
    catalog,
  );

  return Object.freeze(
    candidates
      .filter((candidate) =>
        candidateAllowedByPreferences(candidate, preferences, catalog),
      )
      .slice(0, requestedCount),
  );
}

export function rankGeneratedCandidatesWithPreferences(
  candidates: readonly GeneratedSmoothie[],
  preferences: UserPreferences,
  pantryIds: readonly string[],
  options: RankGeneratedCandidateOptions = {},
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly CandidateScore[] {
  const allowed = candidates.filter((candidate) =>
    candidateAllowedByPreferences(candidate, preferences, catalog),
  );

  return rankGeneratedCandidates(
    allowed,
    scoringContextFromPreferences(preferences, pantryIds),
    options,
    catalog,
  );
}

const MATCH_KIND_RANK: Readonly<Record<RecipeMatchKind, number>> = {
  exact: 3,
  substitution: 2,
  partial: 1,
};

function storedPreferenceBonus(
  match: RecipeMatch,
  preferences: UserPreferences,
): number {
  const key = storedFeedbackKey(match.recipe);
  let bonus = 0;

  if (preferences.favoriteRecipeKeys.includes(key)) {
    bonus += 0.08;
  }
  if (preferences.feedback[key] === "liked") {
    bonus += 0.08;
  }

  const requiredIds = new Set(
    match.recipe.required.map((item) => item.ingredientId),
  );
  if (preferences.favoriteIngredientIds.length > 0 && requiredIds.size > 0) {
    const favoriteHits = preferences.favoriteIngredientIds.filter((id) =>
      requiredIds.has(id),
    ).length;
    bonus +=
      (favoriteHits / requiredIds.size) * 0.05;
  }

  const tags = new Set(match.recipe.tags);
  if (
    preferences.breakfast &&
    tags.has("frühstück")
  ) {
    bonus += 0.03;
  }
  if (preferences.proteinRich && tags.has("protein")) {
    bonus += 0.03;
  }
  if (
    preferences.refreshing &&
    (tags.has("frisch") || tags.has("erfrischend"))
  ) {
    bonus += 0.03;
  }
  if (preferences.filling && tags.has("sättigend")) {
    bonus += 0.03;
  }

  return Math.min(0.2, bonus);
}

export function rankStoredMatchesWithPreferences(
  matches: readonly RecipeMatch[],
  preferences: UserPreferences,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly RecipeMatch[] {
  return Object.freeze(
    matches
      .filter((match) =>
        recipeAllowedByPreferences(match.recipe, preferences, catalog),
      )
      .sort((left, right) => {
        const kindDifference =
          MATCH_KIND_RANK[right.kind] - MATCH_KIND_RANK[left.kind];
        if (kindDifference !== 0) {
          return kindDifference;
        }

        const scoreDifference =
          right.availabilityScore +
          storedPreferenceBonus(right, preferences) -
          (left.availabilityScore +
            storedPreferenceBonus(left, preferences));
        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        const missingDifference =
          left.missingRequired.length - right.missingRequired.length;
        if (missingDifference !== 0) {
          return missingDifference;
        }

        return left.recipe.id < right.recipe.id
          ? -1
          : left.recipe.id > right.recipe.id
            ? 1
            : 0;
      }),
  );
}
