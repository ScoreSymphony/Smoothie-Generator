import { loadBundledNutritionCatalog } from "@/data/nutritionCatalog";
import { loadBundledRecipeCatalog } from "@/data/recipeCatalog";
import {
  calculateNutrition,
  quantifyStoredRecipe,
} from "@/domain";

const RELEASE_RECIPE_IDS = [
  "strawberry_banana",
  "tropical",
  "green_mango",
  "berry_breakfast",
  "peanut_banana",
  "watermelon_mint",
  "silken_tofu_mango",
  "apple_cucumber_fresh",
] as const;

describe("M9 release regression subset", () => {
  test.each(RELEASE_RECIPE_IDS)(
    "%s remains locally loadable with quantities and nutrition",
    (recipeId) => {
      const recipe = loadBundledRecipeCatalog().require(recipeId);
      const quantified = quantifyStoredRecipe(recipe, 1);
      const nutrition = calculateNutrition(
        quantified.required,
        loadBundledNutritionCatalog(),
      );

      expect(quantified.required.length).toBeGreaterThan(0);
      expect(
        quantified.required.every(
          (item) =>
            Number.isFinite(item.quantity.amount) &&
            item.quantity.amount > 0,
        ),
      ).toBe(true);

      expect(Number.isFinite(nutrition.calories)).toBe(true);
      expect(nutrition.calories).toBeGreaterThan(0);
      expect(nutrition.proteinG).toBeGreaterThanOrEqual(0);
      expect(nutrition.carbohydratesG).toBeGreaterThanOrEqual(0);
      expect(nutrition.sugarG).toBeGreaterThanOrEqual(0);
      expect(nutrition.fatG).toBeGreaterThanOrEqual(0);
      expect(nutrition.fiberG).toBeGreaterThanOrEqual(0);
    },
  );
});
