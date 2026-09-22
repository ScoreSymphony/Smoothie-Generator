import ingredients from "../../data/ingredients.json";
import nutrition from "../../data/nutrition.json";
import recipes from "../../data/recipes.json";

type NutritionFile = {
  ingredients: Record<string, unknown>;
};

export const bundledIngredients = ingredients;
export const bundledRecipes = recipes;
export const bundledNutrition = nutrition as NutritionFile;

export function getBundledCatalogStats() {
  return {
    ingredients: bundledIngredients.length,
    recipes: bundledRecipes.length,
    nutritionEntries: Object.keys(bundledNutrition.ingredients).length
  };
}
