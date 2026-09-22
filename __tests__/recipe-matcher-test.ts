import { loadBundledRecipeCatalog } from "@/data/recipeCatalog";
import {
  matchRecipe,
  matchStoredRecipesForPantry,
  rankStoredRecipes,
} from "@/domain/recipeMatcher";

const recipes = loadBundledRecipeCatalog();

describe("stored recipe matcher", () => {
  test("returns a direct exact match with score 1 even when optional items are absent", () => {
    const match = matchRecipe(recipes.require("strawberry_banana"), [
      "banana",
      "strawberry",
      "oat_milk",
    ]);

    expect(match.kind).toBe("exact");
    expect(match.availabilityScore).toBe(1);
    expect(match.missingRequired).toEqual([]);
    expect(match.availableOptional).toEqual([]);
  });

  test("uses known substitutions and exposes them for recipe cards", () => {
    const match = matchRecipe(recipes.require("strawberry_banana"), [
      "banana",
      "strawberry",
      "water",
    ]);

    expect(match.kind).toBe("substitution");
    expect(match.missingRequired).toEqual([]);
    expect(match.substitutionsUsed).toEqual([
      { targetId: "oat_milk", alternativeId: "water" },
    ]);
    expect(match.availabilityScore).toBeCloseTo((2 + 0.9) / 3);
  });

  test("reports missing required ingredients explicitly", () => {
    const match = matchRecipe(recipes.require("strawberry_banana"), ["banana"]);

    expect(match.kind).toBe("partial");
    expect(match.missingRequired.map((item) => item.ingredientId)).toEqual([
      "strawberry",
      "oat_milk",
    ]);
  });

  test("ranks exact matches before substitution-complete and partial matches", () => {
    const ranked = rankStoredRecipes(
      ["banana", "strawberry", "oat_milk", "water"],
      { limit: 80 },
    );

    const exactIndex = ranked.findIndex(
      (match) => match.recipe.id === "strawberry_banana",
    );
    expect(exactIndex).toBeGreaterThanOrEqual(0);
    expect(ranked[exactIndex].kind).toBe("exact");

    const firstPartialIndex = ranked.findIndex(
      (match) => match.kind === "partial",
    );
    expect(firstPartialIndex).toBeGreaterThan(exactIndex);
  });

  test("optional ingredients can improve tie-breaking but never lower availability score", () => {
    const withoutOptional = matchRecipe(
      recipes.require("strawberry_banana"),
      ["banana", "strawberry", "oat_milk"],
    );
    const withOptional = matchRecipe(
      recipes.require("strawberry_banana"),
      ["banana", "strawberry", "oat_milk", "honey"],
    );

    expect(withOptional.availabilityScore).toBe(withoutOptional.availabilityScore);
    expect(withOptional.availableOptional.map((item) => item.ingredientId)).toEqual([
      "honey",
    ]);
  });

  test("integrates always-available pantry basics and returns multiple suggestions", () => {
    const results = matchStoredRecipesForPantry(
      {
        selectedIds: ["mango", "spinach", "banana"],
        alwaysAvailableIds: ["water", "ice"],
        servings: 2,
      },
      { limit: 5 },
    );

    expect(results).toHaveLength(5);
    expect(results[0].recipe.id).toBe("green_mango");
    expect(results[0].kind).toBe("exact");
  });

  test("ranking is deterministic for identical pantry input", () => {
    const pantry = ["banana", "water", "ice", "strawberry"];
    const first = rankStoredRecipes(pantry, { limit: 20 }).map(
      (match) => match.recipe.id,
    );
    const second = rankStoredRecipes(pantry, { limit: 20 }).map(
      (match) => match.recipe.id,
    );

    expect(second).toEqual(first);
  });
});
