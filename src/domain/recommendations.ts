import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import { loadBundledNutritionCatalog } from "@/data/nutritionCatalog";
import { loadBundledRecipeCatalog } from "@/data/recipeCatalog";
import { scoreGeneratedCandidate, type CandidateScore } from "@/domain/candidateScoring";
import { calculateNutrition, type NutritionFacts } from "@/domain/nutrition";
import { availableIngredientIds, type PantryState } from "@/domain/pantry";
import {
  filterPantryByPreferences,
  generateSmoothiesWithPreferences,
  rankGeneratedCandidatesWithPreferences,
  rankStoredMatchesWithPreferences,
  scoringContextFromPreferences,
  type UserPreferences,
} from "@/domain/preferences";
import {
  matchRecipe,
  rankStoredRecipes,
  type RecipeMatch,
} from "@/domain/recipeMatcher";
import {
  quantifyGeneratedSmoothie,
  quantifyStoredRecipe,
  type QuantifiedIngredient,
} from "@/domain/quantities";
import type {
  GeneratedSmoothie,
  GeneratedSmoothieRole,
} from "@/domain/smoothieGenerator";

export type RecommendationSource = "stored" | "generated";

export interface RecommendationView {
  readonly key: string;
  readonly source: RecommendationSource;
  readonly title: string;
  readonly ingredientIds: readonly string[];
  readonly ingredients: readonly QuantifiedIngredient[];
  readonly nutrition: NutritionFacts;
  readonly availabilityLabel: string;
  readonly missingIngredientIds: readonly string[];
  readonly substitutionLabels: readonly string[];
  readonly tags: readonly string[];
  readonly instructions: readonly string[];
}

function generatedRoleForIngredient(ingredientId: string): GeneratedSmoothieRole {
  const ingredient = loadBundledIngredientCatalog().require(ingredientId);
  if (ingredient.category === "fruit" || ingredient.category === "berries") return "main_fruit";
  if (ingredient.category === "liquid") return "liquid";
  if (ingredient.category === "creamy_base") return "creamy_base";
  if (ingredient.category === "protein") return "protein";
  if (ingredient.category === "sweetener") return "sweetener";
  return "extra";
}

export function generatedCandidateFromKey(key: string): GeneratedSmoothie | undefined {
  if (!key.startsWith("generated:")) return undefined;
  const ids = key
    .slice("generated:".length)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (ids.length === 0) return undefined;

  const catalog = loadBundledIngredientCatalog();
  if (ids.some((id) => !catalog.resolve(id))) return undefined;

  return Object.freeze({
    ingredientIds: Object.freeze(ids),
    roles: Object.freeze(
      ids.map((ingredientId) =>
        Object.freeze({
          ingredientId,
          role: generatedRoleForIngredient(ingredientId),
        }),
      ),
    ),
    missingIngredientIds: Object.freeze([]),
  });
}

function generatedTitle(candidate: GeneratedSmoothie): string {
  const catalog = loadBundledIngredientCatalog();
  const fruitNames = candidate.ingredientIds
    .map((id) => catalog.require(id))
    .filter((item) => item.category === "fruit" || item.category === "berries")
    .slice(0, 2)
    .map((item) => item.nameDe);

  const names =
    fruitNames.length > 0
      ? fruitNames
      : candidate.ingredientIds.slice(0, 2).map((id) => catalog.require(id).nameDe);
  return `${names.join(" & ")} Smoothie`;
}

export function recommendationFromGeneratedScore(
  score: CandidateScore,
  servings: number,
): RecommendationView {
  const quantified = quantifyGeneratedSmoothie(score.candidate, servings);
  const nutrition = calculateNutrition(
    quantified.ingredients,
    loadBundledNutritionCatalog(),
  );

  return Object.freeze({
    key: `generated:${[...score.candidate.ingredientIds].sort().join(",")}`,
    source: "generated",
    title: generatedTitle(score.candidate),
    ingredientIds: score.candidate.ingredientIds,
    ingredients: quantified.ingredients,
    nutrition,
    availabilityLabel:
      score.candidate.missingIngredientIds.length === 0
        ? "Alles vorhanden"
        : `${score.candidate.missingIngredientIds.length} Zutat fehlt`,
    missingIngredientIds: score.candidate.missingIngredientIds,
    substitutionLabels: Object.freeze([]),
    tags: Object.freeze(["Neu kombiniert"]),
    instructions: Object.freeze([
      "Alle Zutaten in den Mixer geben.",
      "Cremig mixen und direkt genießen.",
    ]),
  });
}

export function recommendationFromStoredMatch(
  match: RecipeMatch,
  servings: number,
): RecommendationView {
  const quantified = quantifyStoredRecipe(match.recipe, servings);
  const nutrition = calculateNutrition(
    quantified.required,
    loadBundledNutritionCatalog(),
  );
  const catalog = loadBundledIngredientCatalog();

  return Object.freeze({
    key: `stored:${match.recipe.id}`,
    source: "stored",
    title: match.recipe.nameDe,
    ingredientIds: Object.freeze(
      match.recipe.required.map((item) => item.ingredientId),
    ),
    ingredients: quantified.required,
    nutrition,
    availabilityLabel:
      match.kind === "exact"
        ? "Alles vorhanden"
        : match.kind === "substitution"
          ? "Mit Austausch möglich"
          : `${match.missingRequired.length} ${match.missingRequired.length === 1 ? "Zutat fehlt" : "Zutaten fehlen"}`,
    missingIngredientIds: Object.freeze(
      match.missingRequired.map((item) => item.ingredientId),
    ),
    substitutionLabels: Object.freeze(
      match.substitutionsUsed.map(
        (item) =>
          `${catalog.require(item.targetId).nameDe} → ${catalog.require(item.alternativeId).nameDe}`,
      ),
    ),
    tags: match.recipe.tags,
    instructions: match.recipe.instructionsDe,
  });
}

export function buildRecommendations(
  pantry: PantryState,
  preferences: UserPreferences,
  seed = 17,
): readonly RecommendationView[] {
  const available = availableIngredientIds(pantry);
  const filtered = filterPantryByPreferences(available, preferences);

  const stored = rankStoredMatchesWithPreferences(
    rankStoredRecipes(filtered, { limit: 24 }),
    preferences,
  )
    .slice(0, 4)
    .map((match) => recommendationFromStoredMatch(match, pantry.servings));

  const generated = generateSmoothiesWithPreferences(
    filtered,
    preferences,
    { count: 24, seed },
  );
  const generatedRanked = rankGeneratedCandidatesWithPreferences(
    generated,
    preferences,
    filtered,
    { limit: 4 },
  ).map((score) => recommendationFromGeneratedScore(score, pantry.servings));

  return Object.freeze([...stored, ...generatedRanked]);
}

export function resolveRecommendationKey(
  key: string,
  pantry: PantryState,
  preferences: UserPreferences,
): RecommendationView | undefined {
  const available = filterPantryByPreferences(
    availableIngredientIds(pantry),
    preferences,
  );

  if (key.startsWith("stored:")) {
    const recipeId = key.slice("stored:".length);
    const recipe = loadBundledRecipeCatalog().get(recipeId);
    if (!recipe) return undefined;
    return recommendationFromStoredMatch(
      matchRecipe(recipe, available),
      pantry.servings,
    );
  }

  const candidate = generatedCandidateFromKey(key);
  if (!candidate) return undefined;
  const score = scoreGeneratedCandidate(
    candidate,
    scoringContextFromPreferences(preferences, available),
  );
  return recommendationFromGeneratedScore(score, pantry.servings);
}
