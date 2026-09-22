import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import { loadBundledRecipeCatalog } from "@/data/recipeCatalog";
import {
  candidateAllowedByPreferences,
  clearPreferenceFeedback,
  filterPantryByPreferences,
  generateSmoothiesWithPreferences,
  generatedFeedbackKey,
  rankGeneratedCandidatesWithPreferences,
  rankStoredMatchesWithPreferences,
  recipeAllowedByPreferences,
  sanitizeUserPreferences,
  scoringContextFromPreferences,
  storedFeedbackKey,
  toggleFavoriteIngredient,
  toggleFavoriteRecipe,
  withFeedback,
  type UserPreferences,
} from "@/domain/preferences";
import { matchRecipe, type RecipeMatch } from "@/domain/recipeMatcher";
import type {
  GeneratedSmoothie,
  GeneratedSmoothieRole,
} from "@/domain/smoothieGenerator";

function candidate(
  ...pairs: readonly (readonly [string, GeneratedSmoothieRole])[]
): GeneratedSmoothie {
  return Object.freeze({
    ingredientIds: Object.freeze(pairs.map(([id]) => id)),
    roles: Object.freeze(
      pairs.map(([ingredientId, role]) =>
        Object.freeze({ ingredientId, role }),
      ),
    ),
    missingIngredientIds: Object.freeze([]),
  });
}

function prefs(
  overrides: Partial<UserPreferences> = {},
): UserPreferences {
  return sanitizeUserPreferences({
    favoriteIngredientIds: [],
    favoriteRecipeKeys: [],
    excludedIngredientIds: [],
    allergies: [],
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
    feedback: {},
    ...overrides,
  });
}

describe("local preference model", () => {
  test("sanitizes aliases, scales and legacy field names", () => {
    const value = sanitizeUserPreferences({
      favorite_ingredients: ["Heidelbeere", "blueberry"],
      excluded_ingredients: ["Honig"],
      allergies: ["nuts", "nuts"],
      vegan: true,
      vegetarian: true,
      dairy_free: true,
      desired_sweetness: 3,
      desired_creaminess: 2,
      protein_rich: true,
      post_workout: true,
      feedback: {
        "stored:test": "liked",
        invalid: "wat",
      },
    });

    expect(value.favoriteIngredientIds).toEqual(["blueberry"]);
    expect(value.excludedIngredientIds).toEqual(["honey"]);
    expect(value.allergies).toEqual(["nuts"]);
    expect(value.vegan).toBe(true);
    expect(value.vegetarian).toBe(true);
    expect(value.dairyFree).toBe(true);
    expect(value.desiredSweetness).toBe(3);
    expect(value.desiredCreaminess).toBe(2);
    expect(value.proteinRich).toBe(true);
    expect(value.postWorkout).toBe(true);
    expect(value.feedback).toEqual({ "stored:test": "liked" });
  });

  test("favorite and feedback updates are immutable and resettable", () => {
    const initial = prefs();
    const withIngredient = toggleFavoriteIngredient(initial, "Mango");
    const withRecipe = toggleFavoriteRecipe(
      withIngredient,
      "stored:tropical",
    );
    const withLiked = withFeedback(
      withRecipe,
      "stored:tropical",
      "liked",
    );

    expect(initial.favoriteIngredientIds).toEqual([]);
    expect(withLiked.favoriteIngredientIds).toEqual(["mango"]);
    expect(withLiked.favoriteRecipeKeys).toEqual(["stored:tropical"]);
    expect(withLiked.feedback).toEqual({ "stored:tropical": "liked" });
    expect(clearPreferenceFeedback(withLiked).feedback).toEqual({});
  });
});

describe("hard restrictions", () => {
  test("filters excluded, allergen, dairy and non-vegan pantry ingredients", () => {
    const preferences = prefs({
      excludedIngredientIds: ["banana"],
      allergies: ["nuts"],
      vegan: true,
      dairyFree: true,
    });

    expect(
      filterPantryByPreferences(
        [
          "banana",
          "almond_milk",
          "yogurt",
          "honey",
          "strawberry",
          "oat_milk",
        ],
        preferences,
      ),
    ).toEqual(["strawberry", "oat_milk"]);
  });

  test("restricted ingredients never reach generated results, including one-missing mode", () => {
    const preferences = prefs({
      excludedIngredientIds: ["honey"],
      allergies: ["nuts"],
      vegan: true,
      dairyFree: true,
    });

    const generated = generateSmoothiesWithPreferences(
      ["banana", "strawberry", "oat_milk"],
      preferences,
      {
        count: 20,
        seed: 5,
        missingIngredientMode: "one",
      },
    );

    expect(generated.length).toBeGreaterThan(0);
    for (const item of generated) {
      expect(item.ingredientIds).not.toContain("honey");
      expect(item.ingredientIds).not.toContain("yogurt");
      expect(item.ingredientIds).not.toContain("almonds");
      for (const ingredientId of item.ingredientIds) {
        const ingredient =
          loadBundledIngredientCatalog().require(ingredientId);
        expect(ingredient.vegan).toBe(true);
        expect(ingredient.allergens).not.toContain("milk");
        expect(ingredient.allergens).not.toContain("nuts");
      }
    }
  });

  test("do-not-suggest feedback hides generated and stored recipes", () => {
    const generated = candidate(
      ["banana", "main_fruit"],
      ["water", "liquid"],
    );
    const recipe =
      loadBundledRecipeCatalog().require("strawberry_banana");
    const preferences = prefs({
      feedback: {
        [generatedFeedbackKey(generated)]: "do_not_suggest",
        [storedFeedbackKey(recipe)]: "do_not_suggest",
      },
    });

    expect(
      candidateAllowedByPreferences(generated, preferences),
    ).toBe(false);
    expect(recipeAllowedByPreferences(recipe, preferences)).toBe(false);
  });

  test("celery allergy removes celery", () => {
    expect(
      filterPantryByPreferences(
        ["celery", "banana", "water"],
        prefs({ allergies: ["celery"] }),
      ),
    ).toEqual(["banana", "water"]);
  });
});

describe("soft preference ranking", () => {
  const preferenceOnlyWeights = {
    pantryAvailability: 0,
    flavorBalance: 0,
    compatibility: 0,
    textureBalance: 0,
    liquidRatio: 0,
    intensity: 0,
    nutritionFit: 0,
    preferenceFit: 1,
    penaltyScale: 0,
  };

  test("favorite ingredient changes generated ranking", () => {
    const banana = candidate(
      ["banana", "main_fruit"],
      ["water", "liquid"],
    );
    const mango = candidate(
      ["mango", "main_fruit"],
      ["water", "liquid"],
    );
    const preferences = prefs({
      favoriteIngredientIds: ["mango"],
    });

    const ranked = rankGeneratedCandidatesWithPreferences(
      [banana, mango],
      preferences,
      ["banana", "mango", "water"],
      { weights: preferenceOnlyWeights },
    );

    expect(ranked[0].candidate).toEqual(mango);
    expect(ranked[0].total).toBeGreaterThan(ranked[1].total);
  });

  test("liked feedback changes later generated ranking", () => {
    const banana = candidate(
      ["banana", "main_fruit"],
      ["water", "liquid"],
    );
    const mango = candidate(
      ["mango", "main_fruit"],
      ["water", "liquid"],
    );
    const preferences = prefs({
      feedback: {
        [generatedFeedbackKey(banana)]: "liked",
      },
    });

    const ranked = rankGeneratedCandidatesWithPreferences(
      [mango, banana],
      preferences,
      ["banana", "mango", "water"],
      { weights: preferenceOnlyWeights },
    );

    expect(ranked[0].candidate).toEqual(banana);
  });

  test("preference state maps all requested goals into scoring context", () => {
    const context = scoringContextFromPreferences(
      prefs({
        refreshing: true,
        filling: true,
        proteinRich: true,
        lowerCalorie: true,
        breakfast: true,
        postWorkout: true,
        desiredSweetness: 3,
        desiredCreaminess: 2,
      }),
      ["banana", "water"],
    );

    expect(context.goals).toEqual([
      "refreshing",
      "filling",
      "protein_rich",
      "lower_calorie",
      "breakfast",
      "post_workout",
    ]);
    expect(context.desiredSweetness).toBe(3);
    expect(context.desiredCreaminess).toBe(2);
  });

  test("stored favorite is a bounded boost within the same match kind", () => {
    const recipes = loadBundledRecipeCatalog();
    const first = recipes.require("strawberry_banana");
    const second = recipes.require("berry_oat_vegan");
    const pantry = [
      ...new Set([
        ...first.required.map((item) => item.ingredientId),
        ...second.required.map((item) => item.ingredientId),
      ]),
    ];

    const firstMatch = matchRecipe(first, pantry);
    const secondMatch = matchRecipe(second, pantry);
    expect(firstMatch.kind).toBe("exact");
    expect(secondMatch.kind).toBe("exact");

    const ranked = rankStoredMatchesWithPreferences(
      [firstMatch, secondMatch],
      prefs({
        favoriteRecipeKeys: [storedFeedbackKey(second)],
      }),
    );

    expect(ranked[0].recipe.id).toBe(second.id);
  });

  test("personalization never pushes a partial match above an exact match", () => {
    const recipes = loadBundledRecipeCatalog();
    const exactRecipe = recipes.require("strawberry_banana");
    const partialRecipe = recipes.require("berry_oat_vegan");

    const exact = matchRecipe(
      exactRecipe,
      exactRecipe.required.map((item) => item.ingredientId),
    );
    const partial = matchRecipe(partialRecipe, [
      partialRecipe.required[0].ingredientId,
    ]);

    expect(exact.kind).toBe("exact");
    expect(partial.kind).toBe("partial");

    const preferences = prefs({
      favoriteRecipeKeys: [storedFeedbackKey(partialRecipe)],
      feedback: {
        [storedFeedbackKey(partialRecipe)]: "liked",
      },
    });

    const ranked = rankStoredMatchesWithPreferences(
      [partial, exact],
      preferences,
    );

    expect(ranked[0].recipe.id).toBe(exactRecipe.id);
  });
});
