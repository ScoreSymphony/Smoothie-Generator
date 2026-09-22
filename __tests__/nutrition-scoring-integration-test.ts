import { scoreGeneratedCandidate } from "@/domain/candidateScoring";
import type { GeneratedSmoothie } from "@/domain/smoothieGenerator";

describe("nutrition scoring integration", () => {
  test("M5 nutrition fit now uses the bundled M6 nutrition catalog", () => {
    const candidate: GeneratedSmoothie = {
      ingredientIds: ["banana", "oat_milk"],
      roles: [
        { ingredientId: "banana", role: "main_fruit" },
        { ingredientId: "oat_milk", role: "liquid" },
      ],
      missingIngredientIds: [],
    };

    const score = scoreGeneratedCandidate(candidate, {
      nutritionMinimums: { calories: 200 },
    });

    expect(score.components.nutritionFit).toBeGreaterThan(0);
    expect(score.components.nutritionFit).toBeLessThan(0.5);
  });
});
