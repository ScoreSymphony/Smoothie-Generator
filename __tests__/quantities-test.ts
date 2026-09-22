import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import { loadBundledRecipeCatalog } from "@/data/recipeCatalog";
import {
  MAX_RECIPE_SERVINGS,
  createQuantity,
  normalizeQuantityUnit,
  quantifyGeneratedSmoothie,
  quantifyStoredRecipe,
} from "@/domain/quantities";
import type { GeneratedSmoothie } from "@/domain/smoothieGenerator";

const generatedCandidate: GeneratedSmoothie = Object.freeze({
  ingredientIds: Object.freeze(["banana", "strawberry", "oat_milk"]),
  roles: Object.freeze([
    Object.freeze({ ingredientId: "banana", role: "main_fruit" as const }),
    Object.freeze({ ingredientId: "strawberry", role: "main_fruit" as const }),
    Object.freeze({ ingredientId: "oat_milk", role: "liquid" as const }),
  ]),
  missingIngredientIds: Object.freeze([]),
});

describe("quantity units and serving scaling", () => {
  test("normalizes common German and English units", () => {
    expect(normalizeQuantityUnit("g")).toBe("g");
    expect(normalizeQuantityUnit("Stück")).toBe("piece");
    expect(normalizeQuantityUnit("TL")).toBe("tsp");
    expect(normalizeQuantityUnit("EL")).toBe("tbsp");
    expect(normalizeQuantityUnit("Blätter")).toBe("leaf");
    expect(normalizeQuantityUnit("Würfel")).toBe("cube");
  });

  test("rejects unsupported units and invalid amounts", () => {
    expect(() => normalizeQuantityUnit("cups")).toThrow(/Unsupported/);
    expect(() => createQuantity(0, "g")).toThrow(/positive/);
  });

  test("generated one-serving amounts stay within ingredient bounds", () => {
    const catalog = loadBundledIngredientCatalog();
    const quantified = quantifyGeneratedSmoothie(generatedCandidate, 1);

    for (const item of quantified.ingredients) {
      const ingredient = catalog.require(item.ingredientId);
      expect(item.quantity.unit).toBe(ingredient.typicalAmount.unit);
      expect(item.quantity.amount).toBeGreaterThanOrEqual(
        ingredient.typicalAmount.minimum,
      );
      expect(item.quantity.amount).toBeLessThanOrEqual(
        ingredient.typicalAmount.maximum,
      );
    }
  });

  test("generated quantities scale consistently with servings", () => {
    const one = quantifyGeneratedSmoothie(generatedCandidate, 1);
    const two = quantifyGeneratedSmoothie(generatedCandidate, 2);

    expect(two.ingredients.map((item) => item.ingredientId)).toEqual(
      one.ingredients.map((item) => item.ingredientId),
    );

    for (let index = 0; index < one.ingredients.length; index += 1) {
      expect(two.ingredients[index].quantity.amount).toBe(
        one.ingredients[index].quantity.amount * 2,
      );
      expect(two.ingredients[index].quantity.unit).toBe(
        one.ingredients[index].quantity.unit,
      );
    }
  });

  test("stored recipe scaling normalizes common units", () => {
    const recipe = loadBundledRecipeCatalog().require("strawberry_banana");
    const scaled = quantifyStoredRecipe(recipe, 2);

    const banana = scaled.required.find(
      (item) => item.ingredientId === "banana",
    );
    const milk = scaled.required.find(
      (item) => item.ingredientId === "oat_milk",
    );

    expect(banana?.quantity).toEqual({ amount: 2, unit: "piece" });
    expect(milk?.quantity).toEqual({ amount: 400, unit: "ml" });
  });

  test("servings are bounded to the supported mobile range", () => {
    expect(() => quantifyGeneratedSmoothie(generatedCandidate, 0)).toThrow(
      /servings/,
    );
    expect(() =>
      quantifyGeneratedSmoothie(
        generatedCandidate,
        MAX_RECIPE_SERVINGS + 1,
      ),
    ).toThrow(/servings/);
  });
});
