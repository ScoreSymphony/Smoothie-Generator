import qualityScenarios from "../data/quality_scenarios.json";

import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import { generateSmoothies } from "@/domain/smoothieGenerator";

interface QualityScenario {
  readonly id: string;
  readonly kind: "sparse" | "standard" | "large" | "restriction" | "difficult";
  readonly pantry: readonly string[];
  readonly vegan: boolean;
  readonly excluded_allergens: readonly string[];
  readonly min_candidates: number;
  readonly mode: string;
}

const scenarios = qualityScenarios as readonly QualityScenario[];

describe("rule-based generator quality scenarios", () => {
  test("quality set retains the required breadth", () => {
    const kinds = new Set(scenarios.map((scenario) => scenario.kind));

    expect(scenarios.length).toBeGreaterThanOrEqual(30);
    expect(scenarios.length).toBeLessThanOrEqual(50);
    expect(kinds).toEqual(
      new Set(["sparse", "standard", "large", "restriction", "difficult"]),
    );
    expect(scenarios.filter((scenario) => scenario.kind === "sparse").length).toBeGreaterThanOrEqual(8);
    expect(scenarios.filter((scenario) => scenario.kind === "large").length).toBeGreaterThanOrEqual(5);
    expect(scenarios.filter((scenario) => scenario.kind === "restriction").length).toBeGreaterThanOrEqual(8);
    expect(scenarios.filter((scenario) => scenario.kind === "difficult").length).toBeGreaterThanOrEqual(8);
  });

  test("strict pantry scenarios never leak unavailable or restricted ingredients", () => {
    const catalog = loadBundledIngredientCatalog();

    for (const scenario of scenarios) {
      const pantry = new Set(scenario.pantry);
      const excludedAllergens = new Set(scenario.excluded_allergens);
      const result = generateSmoothies(scenario.pantry, {
        count: 50,
        seed: 17,
        vegan: scenario.vegan,
        excludedAllergens: scenario.excluded_allergens,
      });

      expect(result.length).toBeGreaterThanOrEqual(scenario.min_candidates);

      for (const candidate of result) {
        expect(candidate.missingIngredientIds).toEqual([]);
        expect(new Set(candidate.ingredientIds).size).toBe(candidate.ingredientIds.length);
        expect(
          candidate.roles.some((assignment) => assignment.role === "main_fruit"),
        ).toBe(true);
        expect(
          candidate.roles.some((assignment) => assignment.role === "liquid"),
        ).toBe(true);

        for (const ingredientId of candidate.ingredientIds) {
          expect(pantry.has(ingredientId)).toBe(true);
          const ingredient = catalog.require(ingredientId);
          if (scenario.vegan) {
            expect(ingredient.vegan).toBe(true);
          }
          expect(
            ingredient.allergens.some((allergen) =>
              excludedAllergens.has(allergen),
            ),
          ).toBe(false);
        }
      }
    }
  });

  test("all quality scenarios are deterministic for a fixed seed", () => {
    for (const scenario of scenarios) {
      const options = {
        count: 20,
        seed: 23,
        vegan: scenario.vegan,
        excludedAllergens: scenario.excluded_allergens,
      } as const;

      expect(generateSmoothies(scenario.pantry, options)).toEqual(
        generateSmoothies([...scenario.pantry].reverse(), options),
      );
    }
  });
});
