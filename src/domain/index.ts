export {
  INGREDIENT_CATEGORIES,
  IngredientValidationError,
  parseIngredientRecord,
  type AmountRange,
  type Ingredient,
  type IngredientCategory,
} from "./ingredients";

export {
  parseRecipeRecord,
  RecipeValidationError,
  type Recipe,
  type RecipeIngredient,
  type RecipeSubstitutionGroup,
} from "./recipes";

export {
  matchRecipe,
  matchStoredRecipesForPantry,
  rankStoredRecipes,
  type MatchStoredRecipeOptions,
  type RecipeMatch,
  type RecipeMatchKind,
  type RecipeSubstitutionUse,
} from "./recipeMatcher";

export {
  EXHAUSTIVE_COMBINATION_LIMIT,
  MAX_COMBINATION_EVALUATIONS,
  generateSmoothies,
  type GeneratedSmoothie,
  type GeneratedSmoothieRole,
  type GeneratedSmoothieRoleAssignment,
  type SmoothieGenerationOptions,
} from "./smoothieGenerator";

export {
  DEFAULT_SCORING_WEIGHTS,
  calculateLiquidRatio,
  rankGeneratedCandidates,
  scoreCompatibility,
  scoreFlavorBalance,
  scoreGeneratedCandidate,
  type CandidateScore,
  type RankGeneratedCandidateOptions,
  type ScoreComponents,
  type ScorePenalties,
  type ScoringContext,
  type ScoringGoal,
  type ScoringWeights,
} from "./candidateScoring";

export {
  MAX_RECIPE_SERVINGS,
  MIN_RECIPE_SERVINGS,
  QUANTITY_UNITS,
  QUANTITY_UNIT_LABELS_DE,
  createQuantity,
  formatQuantityAmount,
  normalizeQuantityUnit,
  quantifyGeneratedSmoothie,
  quantifyStoredRecipe,
  quantityLabelDe,
  type QuantifiedIngredient,
  type QuantifiedRecipe,
  type QuantifiedSmoothie,
  type Quantity,
  type QuantityUnit,
} from "./quantities";

export {
  EMPTY_NUTRITION_FACTS,
  NutritionValidationError,
  addNutritionFacts,
  calculateNutrition,
  quantityToApproximateGrams,
  roundNutritionFacts,
  scaleNutritionFacts,
  type NutritionCatalogLike,
  type NutritionFacts,
} from "./nutrition";

export {
  DEFAULT_USER_PREFERENCES,
  FEEDBACK_VALUES,
  candidateAllowedByPreferences,
  clearPreferenceFeedback,
  filterPantryByPreferences,
  generateSmoothiesWithPreferences,
  generatedFeedbackKey,
  ingredientAllowedByPreferences,
  rankGeneratedCandidatesWithPreferences,
  rankStoredMatchesWithPreferences,
  recipeAllowedByPreferences,
  sanitizeUserPreferences,
  scoringContextFromPreferences,
  storedFeedbackKey,
  toggleFavoriteIngredient,
  toggleFavoriteRecipe,
  withFeedback,
  type FeedbackValue,
  type UserPreferences,
} from "./preferences";
