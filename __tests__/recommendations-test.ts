import {
  buildRecommendations,
  generatedCandidateFromKey,
  resolveRecommendationKey,
} from "@/domain/recommendations";
import { DEFAULT_USER_PREFERENCES } from "@/domain/preferences";

const pantry = {
  selectedIds: ["banana", "strawberry", "oat_milk"],
  alwaysAvailableIds: ["water", "ice"],
  servings: 2,
} as const;

describe("mobile recommendation view model", () => {
  test("builds stored and generated recommendations from the local pantry", () => {
    const items = buildRecommendations(pantry, DEFAULT_USER_PREFERENCES, 17);

    expect(items.length).toBeGreaterThan(1);
    expect(items.some((item) => item.source === "stored")).toBe(true);
    expect(items.some((item) => item.source === "generated")).toBe(true);
    expect(
      items.every(
        (item) =>
          item.ingredients.length > 0 &&
          item.nutrition.calories >= 0 &&
          item.instructions.length > 0,
      ),
    ).toBe(true);
  });

  test("cycles to a different recommendation set on the next page", () => {
    const firstPage = buildRecommendations(
      pantry,
      DEFAULT_USER_PREFERENCES,
      17,
      0,
    );
    const secondPage = buildRecommendations(
      pantry,
      DEFAULT_USER_PREFERENCES,
      17,
      1,
    );

    expect(secondPage.map((item) => item.key)).not.toEqual(
      firstPage.map((item) => item.key),
    );
  });

  test("stored recommendation exposes quantities, availability and instructions", () => {
    const item = resolveRecommendationKey(
      "stored:strawberry_banana",
      pantry,
      DEFAULT_USER_PREFERENCES,
    );

    expect(item?.title).toBe("Erdbeer-Banane");
    expect(item?.availabilityLabel).toBe("Alles vorhanden");
    expect(item?.ingredients.length).toBeGreaterThan(0);
    expect(item?.nutrition.calories).toBeGreaterThan(0);
    expect(item?.instructions.length).toBeGreaterThan(0);
  });

  test("generated favorites can be reconstructed from their stable key", () => {
    const candidate = generatedCandidateFromKey(
      "generated:banana,oat_milk,strawberry",
    );
    expect(candidate?.roles).toEqual(
      expect.arrayContaining([
        { ingredientId: "banana", role: "main_fruit" },
        { ingredientId: "oat_milk", role: "liquid" },
      ]),
    );

    const item = resolveRecommendationKey(
      "generated:banana,oat_milk,strawberry",
      pantry,
      DEFAULT_USER_PREFERENCES,
    );
    expect(item?.source).toBe("generated");
    expect(item?.title).toMatch(/Smoothie/);
  });
});
