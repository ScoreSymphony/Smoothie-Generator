import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import {
  createNutritionCatalog,
  loadBundledNutritionCatalog,
} from "@/data/nutritionCatalog";
import {
  calculateNutrition,
  quantityToApproximateGrams,
} from "@/domain/nutrition";
import { createQuantity, quantifyGeneratedSmoothie } from "@/domain/quantities";
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

describe("bundled offline nutrition", () => {
  test("covers every curated ingredient", () => {
    expect(loadBundledNutritionCatalog().size).toBe(
      loadBundledIngredientCatalog().size,
    );
    expect(loadBundledNutritionCatalog().size).toBe(119);
  });

  test("rejects incomplete or unknown nutrition catalogs", () => {
    expect(() =>
      createNutritionCatalog({
        ingredients: {
          banana: {
            calories: 89,
            protein_g: 1.1,
            carbohydrates_g: 22.8,
            sugar_g: 12.2,
            fat_g: 0.3,
            fiber_g: 2.6,
          },
        },
      }),
    ).toThrow(/missing ingredient ids/);

    expect(() =>
      createNutritionCatalog({
        ingredients: {
          unknown: {
            calories: 1,
            protein_g: 0,
            carbohydrates_g: 0,
            sugar_g: 0,
            fat_g: 0,
            fiber_g: 0,
          },
        },
      }),
    ).toThrow(/unknown ingredient/);
  });

  test("aggregates local per-100g values", () => {
    const facts = calculateNutrition(
      [
        {
          ingredientId: "banana",
          quantity: createQuantity(100, "g"),
        },
      ],
      loadBundledNutritionCatalog(),
    );

    expect(facts.calories).toBe(89);
    expect(facts.proteinG).toBe(1.1);
    expect(facts.fiberG).toBe(2.6);
  });

  test("converts common recipe units to approximate grams", () => {
    expect(
      quantityToApproximateGrams(
        "banana",
        createQuantity(1, "piece"),
      ),
    ).toBe(105);
    expect(
      quantityToApproximateGrams(
        "honey",
        createQuantity(1, "tsp"),
      ),
    ).toBe(5);
    expect(
      quantityToApproximateGrams(
        "honey",
        createQuantity(1, "tbsp"),
      ),
    ).toBe(15);
  });

  test("doubling servings doubles aggregated nutrition", () => {
    const nutrition = loadBundledNutritionCatalog();
    const one = quantifyGeneratedSmoothie(generatedCandidate, 1);
    const two = quantifyGeneratedSmoothie(generatedCandidate, 2);

    const oneFacts = calculateNutrition(one.ingredients, nutrition);
    const twoFacts = calculateNutrition(two.ingredients, nutrition);

    expect(twoFacts.calories).toBeCloseTo(oneFacts.calories * 2, 1);
    expect(twoFacts.proteinG).toBeCloseTo(oneFacts.proteinG * 2, 1);
    expect(twoFacts.carbohydratesG).toBeCloseTo(
      oneFacts.carbohydratesG * 2,
      1,
    );
  });
});
