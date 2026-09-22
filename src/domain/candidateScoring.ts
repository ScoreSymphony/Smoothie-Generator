import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import { loadBundledNutritionCatalog } from "@/data/nutritionCatalog";
import type { Ingredient } from "@/domain/ingredients";
import type {
  GeneratedSmoothie,
  GeneratedSmoothieRole,
} from "@/domain/smoothieGenerator";

export interface ScoringWeights {
  readonly pantryAvailability: number;
  readonly flavorBalance: number;
  readonly compatibility: number;
  readonly textureBalance: number;
  readonly liquidRatio: number;
  readonly intensity: number;
  readonly nutritionFit: number;
  readonly preferenceFit: number;
  readonly penaltyScale: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = Object.freeze({
  pantryAvailability: 1.5,
  flavorBalance: 2,
  compatibility: 1.25,
  textureBalance: 1,
  liquidRatio: 1.5,
  intensity: 1,
  nutritionFit: 0.5,
  preferenceFit: 0.75,
  penaltyScale: 25,
});

export type ScoringGoal =
  | "refreshing"
  | "filling"
  | "protein_rich"
  | "lower_calorie"
  | "breakfast"
  | "post_workout";

export interface ScoringContext {
  readonly pantryIngredientIds?: readonly string[];
  readonly preferredIngredientIds?: readonly string[];
  readonly nutritionMinimums?: Readonly<Record<string, number>>;
  readonly desiredSweetness?: number;
  readonly desiredCreaminess?: number;
  readonly goals?: readonly ScoringGoal[];
  readonly likedCandidateKeys?: readonly string[];
}

export interface ScoreComponents {
  readonly pantryAvailability: number;
  readonly flavorBalance: number;
  readonly compatibility: number;
  readonly textureBalance: number;
  readonly liquidRatio: number;
  readonly intensity: number;
  readonly nutritionFit: number;
  readonly preferenceFit: number;
}

export interface ScorePenalties {
  readonly excessAcidity: number;
  readonly excessSweetness: number;
  readonly dominantFlavors: number;
  readonly poorLiquidBalance: number;
  readonly incompatibleCombination: number;
}

export interface CandidateScore {
  readonly candidate: GeneratedSmoothie;
  readonly total: number;
  readonly components: ScoreComponents;
  readonly penalties: ScorePenalties;
  readonly explanations: readonly string[];
}

export interface RankGeneratedCandidateOptions {
  readonly limit?: number;
  readonly weights?: Partial<ScoringWeights>;
}

interface CandidateAverages {
  readonly sweetness: number;
  readonly acidity: number;
  readonly bitterness: number;
  readonly creaminess: number;
  readonly intensity: number;
  readonly waterContribution: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function rangeScore(
  value: number,
  low: number,
  high: number,
  minimum = 0,
  maximum = 5,
): number {
  if (value >= low && value <= high) {
    return 1;
  }

  if (value < low) {
    const span = Math.max(low - minimum, Number.EPSILON);
    return Math.max(0, 1 - (low - value) / span);
  }

  const span = Math.max(maximum - high, Number.EPSILON);
  return Math.max(0, 1 - (value - high) / span);
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function candidateAverages(
  ingredients: readonly Ingredient[],
): CandidateAverages {
  return Object.freeze({
    sweetness: average(ingredients.map((item) => item.sweetness)),
    acidity: average(ingredients.map((item) => item.acidity)),
    bitterness: average(ingredients.map((item) => item.bitterness)),
    creaminess: average(ingredients.map((item) => item.creaminess)),
    intensity: average(ingredients.map((item) => item.intensity)),
    waterContribution: average(
      ingredients.map((item) => item.waterContribution),
    ),
  });
}

function explicitIncompatibilities(
  ingredients: readonly Ingredient[],
): readonly (readonly [string, string])[] {
  const ids = new Set(ingredients.map((item) => item.id));
  const pairs = new Set<string>();

  for (const ingredient of ingredients) {
    for (const tag of ingredient.compatibilityTags) {
      if (!tag.startsWith("avoid:")) {
        continue;
      }

      const otherId = tag.slice("avoid:".length);
      if (!ids.has(otherId)) {
        continue;
      }

      pairs.add([ingredient.id, otherId].sort().join("|"));
    }
  }

  return Object.freeze(
    [...pairs]
      .sort()
      .map((pair) => Object.freeze(pair.split("|") as [string, string])),
  );
}

export function scoreFlavorBalance(
  ingredients: readonly Ingredient[],
): number {
  const averages = candidateAverages(ingredients);

  return (
    rangeScore(averages.sweetness, 2, 4) +
    rangeScore(averages.acidity, 0.75, 3.25) +
    rangeScore(averages.bitterness, 0, 1.75)
  ) / 3;
}

export function scoreCompatibility(
  ingredients: readonly Ingredient[],
): number {
  if (explicitIncompatibilities(ingredients).length > 0) {
    return 0;
  }

  const tagSets = ingredients
    .map(
      (ingredient) =>
        new Set(
          ingredient.compatibilityTags.filter(
            (tag) => !tag.startsWith("avoid:"),
          ),
        ),
    )
    .filter((tags) => tags.size > 0);

  if (tagSets.length < 2) {
    return 0.75;
  }

  let pairs = 0;
  let compatiblePairs = 0;

  for (let left = 0; left < tagSets.length; left += 1) {
    for (let right = left + 1; right < tagSets.length; right += 1) {
      pairs += 1;
      if ([...tagSets[left]].some((tag) => tagSets[right].has(tag))) {
        compatiblePairs += 1;
      }
    }
  }

  const affinity = pairs > 0 ? compatiblePairs / pairs : 0;
  return 0.65 + 0.35 * affinity;
}

function typicalAmountMidpoint(ingredient: Ingredient): number {
  return (
    (ingredient.typicalAmount.minimum + ingredient.typicalAmount.maximum) / 2
  );
}

export function calculateLiquidRatio(
  ingredients: readonly Ingredient[],
): number {
  const total = ingredients.reduce(
    (sum, ingredient) => sum + typicalAmountMidpoint(ingredient),
    0,
  );
  if (total <= 0) {
    return 0;
  }

  const liquid = ingredients
    .filter((ingredient) => ingredient.category === "liquid")
    .reduce(
      (sum, ingredient) => sum + typicalAmountMidpoint(ingredient),
      0,
    );

  return liquid / total;
}

function canonicalContextIds(
  values: readonly string[] | undefined,
  catalog: IngredientCatalog,
): ReadonlySet<string> {
  const result = new Set<string>();

  for (const value of values ?? []) {
    const id = catalog.resolveId(value);
    if (id) {
      result.add(id);
    }
  }

  return result;
}

function scorePantryAvailability(
  candidate: GeneratedSmoothie,
  context: ScoringContext,
  catalog: IngredientCatalog,
): number {
  if (candidate.ingredientIds.length === 0) {
    return 0;
  }

  const pantry = canonicalContextIds(context.pantryIngredientIds, catalog);
  if (pantry.size > 0) {
    const available = candidate.ingredientIds.filter((id) =>
      pantry.has(id),
    ).length;
    return available / candidate.ingredientIds.length;
  }

  const missing = new Set(candidate.missingIngredientIds);
  const available = candidate.ingredientIds.filter(
    (id) => !missing.has(id),
  ).length;

  return available / candidate.ingredientIds.length;
}

function nutritionValue(
  ingredientId: string,
  nutrient: string,
): number | undefined {
  const facts = loadBundledNutritionCatalog().require(ingredientId);
  const aliases: Readonly<Record<string, keyof typeof facts>> = {
    calories: "calories",
    protein: "proteinG",
    protein_g: "proteinG",
    proteinG: "proteinG",
    carbohydrates: "carbohydratesG",
    carbohydrates_g: "carbohydratesG",
    carbohydratesG: "carbohydratesG",
    sugar: "sugarG",
    sugar_g: "sugarG",
    sugarG: "sugarG",
    fat: "fatG",
    fat_g: "fatG",
    fatG: "fatG",
    fiber: "fiberG",
    fiber_g: "fiberG",
    fiberG: "fiberG",
  };
  const key = aliases[nutrient];
  return key ? facts[key] : undefined;
}

function scoreNutritionFit(
  ingredients: readonly Ingredient[],
  context: ScoringContext,
): number {
  const minimums = context.nutritionMinimums ?? {};
  const targets = Object.entries(minimums).filter(
    ([, target]) => Number.isFinite(target) && target > 0,
  );

  if (targets.length === 0) {
    return 0.5;
  }

  const scores: number[] = [];

  for (const [nutrient, target] of targets) {
    const values = ingredients
      .map((ingredient) => nutritionValue(ingredient.id, nutrient))
      .filter((value): value is number => value !== undefined);

    if (values.length > 0) {
      scores.push(Math.min(1, average(values) / target));
    }
  }

  return scores.length > 0 ? average(scores) : 0.5;
}

function candidateKey(candidate: GeneratedSmoothie): string {
  return `generated:${[...candidate.ingredientIds].sort().join(",")}`;
}

function hasRole(
  candidate: GeneratedSmoothie,
  role: GeneratedSmoothieRole,
): boolean {
  return candidate.roles.some((assignment) => assignment.role === role);
}

function scorePreferenceFit(
  candidate: GeneratedSmoothie,
  ingredients: readonly Ingredient[],
  averages: CandidateAverages,
  context: ScoringContext,
  catalog: IngredientCatalog,
): number {
  const scores: number[] = [];
  const ids = new Set(candidate.ingredientIds);

  const preferred = canonicalContextIds(
    context.preferredIngredientIds,
    catalog,
  );
  if (preferred.size > 0) {
    scores.push(
      [...preferred].filter((ingredientId) => ids.has(ingredientId)).length /
        preferred.size,
    );
  }

  if (context.desiredSweetness !== undefined) {
    scores.push(
      clamp01(
        1 -
          Math.abs(
            averages.sweetness - clamp01(context.desiredSweetness / 5) * 5,
          ) /
            5,
      ),
    );
  }

  if (context.desiredCreaminess !== undefined) {
    scores.push(
      clamp01(
        1 -
          Math.abs(
            averages.creaminess -
              clamp01(context.desiredCreaminess / 5) * 5,
          ) /
            5,
      ),
    );
  }

  const categories = new Set(ingredients.map((ingredient) => ingredient.category));
  const goals = new Set(context.goals ?? []);

  if (goals.has("refreshing")) {
    const water = averages.waterContribution / 5;
    const lightness = 1 - averages.creaminess / 5;
    scores.push((water + lightness) / 2);
  }

  if (goals.has("filling")) {
    const fillingIds = new Set([
      "oats",
      "chia_seeds",
      "flax_seeds",
      "hemp_seeds",
    ]);
    const filling =
      [...ids].some((id) => fillingIds.has(id)) ||
      categories.has("protein") ||
      categories.has("nuts") ||
      categories.has("creamy_base");
    scores.push(filling ? 1 : 0.25);
  }

  if (goals.has("protein_rich")) {
    scores.push(
      categories.has("protein") || hasRole(candidate, "protein") ? 1 : 0,
    );
  }

  if (goals.has("lower_calorie")) {
    const calories = ingredients.map(
      (ingredient) =>
        loadBundledNutritionCatalog().require(ingredient.id).calories,
    );
    scores.push(clamp01(1 - average(calories) / 400));
  }

  if (goals.has("breakfast")) {
    const breakfastIds = new Set([
      "banana",
      "oats",
      "yogurt",
      "greek_yogurt",
      "coconut_yogurt",
      "chia_seeds",
      "flax_seeds",
    ]);
    scores.push(
      Math.min(
        1,
        [...ids].filter((id) => breakfastIds.has(id)).length / 2,
      ),
    );
  }

  if (goals.has("post_workout")) {
    const hasProtein =
      categories.has("protein") || hasRole(candidate, "protein");
    const hasFruit =
      categories.has("fruit") || categories.has("berries");
    scores.push((Number(hasProtein) + Number(hasFruit)) / 2);
  }

  if ((context.likedCandidateKeys ?? []).includes(candidateKey(candidate))) {
    scores.push(1);
  }

  return scores.length > 0 ? average(scores) : 0.5;
}

function resolveWeights(
  overrides: Partial<ScoringWeights> | undefined,
): ScoringWeights {
  const weights: ScoringWeights = Object.freeze({
    ...DEFAULT_SCORING_WEIGHTS,
    ...overrides,
  });

  const componentWeights = [
    weights.pantryAvailability,
    weights.flavorBalance,
    weights.compatibility,
    weights.textureBalance,
    weights.liquidRatio,
    weights.intensity,
    weights.nutritionFit,
    weights.preferenceFit,
  ];

  if (
    [...componentWeights, weights.penaltyScale].some(
      (value) => !Number.isFinite(value) || value < 0,
    )
  ) {
    throw new Error("Scoring weights must be finite and non-negative");
  }

  if (componentWeights.reduce((sum, value) => sum + value, 0) <= 0) {
    throw new Error("At least one scoring component weight must be positive");
  }

  return weights;
}

export function scoreGeneratedCandidate(
  candidate: GeneratedSmoothie,
  context: ScoringContext = {},
  weightOverrides?: Partial<ScoringWeights>,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): CandidateScore {
  if (candidate.ingredientIds.length === 0) {
    throw new Error("Cannot score an empty smoothie candidate");
  }

  const ingredients = candidate.ingredientIds.map((id) => catalog.require(id));
  const averages = candidateAverages(ingredients);
  const liquidRatio = calculateLiquidRatio(ingredients);
  const incompatibilities = explicitIncompatibilities(ingredients);

  const components: ScoreComponents = Object.freeze({
    pantryAvailability: scorePantryAvailability(candidate, context, catalog),
    flavorBalance: scoreFlavorBalance(ingredients),
    compatibility: scoreCompatibility(ingredients),
    textureBalance: rangeScore(averages.creaminess, 1.25, 3.75),
    liquidRatio: rangeScore(
      liquidRatio,
      0.35,
      0.65,
      0,
      1,
    ),
    intensity: rangeScore(averages.intensity, 1, 3.5),
    nutritionFit: scoreNutritionFit(ingredients, context),
    preferenceFit: scorePreferenceFit(
      candidate,
      ingredients,
      averages,
      context,
      catalog,
    ),
  });

  const penalties: ScorePenalties = Object.freeze({
    excessAcidity: clamp01((averages.acidity - 3.5) / 1.5),
    excessSweetness: clamp01((averages.sweetness - 4.25) / 0.75),
    dominantFlavors: clamp01(
      (ingredients.filter((item) => item.intensity >= 5).length - 1) / 2,
    ),
    poorLiquidBalance: clamp01(
      Math.max(0.25 - liquidRatio, liquidRatio - 0.75) / 0.25,
    ),
    incompatibleCombination: incompatibilities.length > 0 ? 1 : 0,
  });

  const weights = resolveWeights(weightOverrides);
  const weighted =
    components.pantryAvailability * weights.pantryAvailability +
    components.flavorBalance * weights.flavorBalance +
    components.compatibility * weights.compatibility +
    components.textureBalance * weights.textureBalance +
    components.liquidRatio * weights.liquidRatio +
    components.intensity * weights.intensity +
    components.nutritionFit * weights.nutritionFit +
    components.preferenceFit * weights.preferenceFit;

  const weightTotal =
    weights.pantryAvailability +
    weights.flavorBalance +
    weights.compatibility +
    weights.textureBalance +
    weights.liquidRatio +
    weights.intensity +
    weights.nutritionFit +
    weights.preferenceFit;

  const penaltyTotal =
    penalties.excessAcidity +
    penalties.excessSweetness +
    penalties.dominantFlavors +
    penalties.poorLiquidBalance +
    penalties.incompatibleCombination;

  const total = clamp01(
    weighted / weightTotal - (penaltyTotal * weights.penaltyScale) / 100,
  ) * 100;

  return Object.freeze({
    candidate,
    total: Math.round(total * 100) / 100,
    components,
    penalties,
    explanations: Object.freeze([
      `Geschmack ${components.flavorBalance.toFixed(2)}`,
      `Kompatibilität ${components.compatibility.toFixed(2)}`,
      `Textur ${components.textureBalance.toFixed(2)}`,
      `Flüssigkeitsbalance ${components.liquidRatio.toFixed(2)}`,
      `Intensität ${components.intensity.toFixed(2)}`,
    ]),
  });
}

function coreSignature(candidate: GeneratedSmoothie): string {
  const trivialRoles = new Set<GeneratedSmoothieRole>([
    "sweetener",
    "extra",
  ]);

  return candidate.roles
    .filter((assignment) => !trivialRoles.has(assignment.role))
    .map((assignment) => assignment.ingredientId)
    .sort()
    .join("|");
}

function stableCandidateKey(candidate: GeneratedSmoothie): string {
  return [...candidate.ingredientIds].sort().join("|");
}

export function rankGeneratedCandidates(
  candidates: readonly GeneratedSmoothie[],
  context: ScoringContext = {},
  options: RankGeneratedCandidateOptions = {},
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly CandidateScore[] {
  const limit =
    options.limit === undefined
      ? undefined
      : Math.max(0, Math.floor(options.limit));

  const scored = candidates
    .map((candidate) =>
      scoreGeneratedCandidate(
        candidate,
        context,
        options.weights,
        catalog,
      ),
    )
    .sort((left, right) => {
      const totalDifference = right.total - left.total;
      if (totalDifference !== 0) {
        return totalDifference;
      }

      const leftKey = stableCandidateKey(left.candidate);
      const rightKey = stableCandidateKey(right.candidate);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });

  const deduplicated: CandidateScore[] = [];
  const seen = new Set<string>();

  for (const item of scored) {
    const signature = coreSignature(item.candidate);
    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    deduplicated.push(item);

    if (limit !== undefined && deduplicated.length >= limit) {
      break;
    }
  }

  return Object.freeze(deduplicated);
}
