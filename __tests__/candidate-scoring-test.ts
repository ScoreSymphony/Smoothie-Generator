import {
  DEFAULT_SCORING_WEIGHTS,
  calculateLiquidRatio,
  rankGeneratedCandidates,
  scoreCompatibility,
  scoreFlavorBalance,
  scoreGeneratedCandidate,
} from "@/domain/candidateScoring";
import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
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

describe("candidate scoring components", () => {
  const catalog = loadBundledIngredientCatalog();

  test("exposes independently testable flavor, compatibility and liquid scores", () => {
    const balanced = [
      catalog.require("banana"),
      catalog.require("strawberry"),
      catalog.require("oat_milk"),
    ];

    expect(scoreFlavorBalance(balanced)).toBeGreaterThan(0.7);
    expect(scoreCompatibility(balanced)).toBeGreaterThan(0);
    expect(calculateLiquidRatio(balanced)).toBeGreaterThan(0);
    expect(calculateLiquidRatio(balanced)).toBeLessThan(1);
  });

  test("score exposes all requested components and debug explanations", () => {
    const item = candidate(
      ["banana", "main_fruit"],
      ["oat_milk", "liquid"],
    );

    const score = scoreGeneratedCandidate(item, {
      pantryIngredientIds: ["banana", "oat_milk"],
      preferredIngredientIds: ["banana"],
    });

    expect(Object.keys(score.components).sort()).toEqual(
      [
        "compatibility",
        "flavorBalance",
        "intensity",
        "liquidRatio",
        "nutritionFit",
        "pantryAvailability",
        "preferenceFit",
        "textureBalance",
      ].sort(),
    );
    expect(score.components.pantryAvailability).toBe(1);
    expect(score.components.preferenceFit).toBe(1);
    expect(score.components.nutritionFit).toBe(0.5);
    expect(score.explanations.length).toBeGreaterThan(0);
  });

  test("explicit missing ingredient lowers pantry availability", () => {
    const item: GeneratedSmoothie = {
      ...candidate(
        ["banana", "main_fruit"],
        ["oat_milk", "liquid"],
      ),
      missingIngredientIds: ["oat_milk"],
    };

    const score = scoreGeneratedCandidate(item);

    expect(score.components.pantryAvailability).toBe(0.5);
  });

  test("custom weights can rank toward preferred ingredients", () => {
    const mango = candidate(
      ["mango", "main_fruit"],
      ["water", "liquid"],
    );
    const banana = candidate(
      ["banana", "main_fruit"],
      ["water", "liquid"],
    );

    const weights = {
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

    const ranked = rankGeneratedCandidates(
      [banana, mango],
      { preferredIngredientIds: ["mango"] },
      { weights },
    );

    expect(ranked[0].candidate).toEqual(mango);
    expect(DEFAULT_SCORING_WEIGHTS.preferenceFit).toBeGreaterThan(0);
  });

  test("invalid weights are rejected", () => {
    const item = candidate(
      ["banana", "main_fruit"],
      ["water", "liquid"],
    );

    expect(() =>
      scoreGeneratedCandidate(item, {}, { flavorBalance: -1 }),
    ).toThrow(/non-negative/);

    expect(() =>
      scoreGeneratedCandidate(item, {}, {
        pantryAvailability: 0,
        flavorBalance: 0,
        compatibility: 0,
        textureBalance: 0,
        liquidRatio: 0,
        intensity: 0,
        nutritionFit: 0,
        preferenceFit: 0,
      }),
    ).toThrow(/At least one/);
  });
});

describe("candidate ranking", () => {
  test("balanced candidate outranks overly acidic intense candidate", () => {
    const balanced = candidate(
      ["banana", "main_fruit"],
      ["strawberry", "main_fruit"],
      ["oat_milk", "liquid"],
    );
    const harsh = candidate(
      ["orange", "main_fruit"],
      ["pineapple", "main_fruit"],
      ["orange_juice", "liquid"],
      ["lemon_juice", "extra"],
    );

    const ranked = rankGeneratedCandidates([harsh, balanced]);

    expect(ranked[0].candidate).toEqual(balanced);
    expect(ranked[0].total).toBeGreaterThan(ranked[1].total);
    expect(ranked[1].penalties.excessAcidity).toBeGreaterThan(0);
  });

  test("near-identical variants are deduplicated by non-trivial core roles", () => {
    const base = candidate(
      ["banana", "main_fruit"],
      ["oat_milk", "liquid"],
    );
    const withExtra = candidate(
      ["banana", "main_fruit"],
      ["oat_milk", "liquid"],
      ["cinnamon", "extra"],
    );

    const ranked = rankGeneratedCandidates([withExtra, base]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].candidate.ingredientIds).toEqual(
      expect.arrayContaining(["banana", "oat_milk"]),
    );
  });

  test("ranking is deterministic independent of input order", () => {
    const candidates = [
      candidate(["banana", "main_fruit"], ["water", "liquid"]),
      candidate(["mango", "main_fruit"], ["water", "liquid"]),
      candidate(["strawberry", "main_fruit"], ["oat_milk", "liquid"]),
    ];

    const first = rankGeneratedCandidates(candidates).map(
      (item) => item.candidate.ingredientIds,
    );
    const second = rankGeneratedCandidates([...candidates].reverse()).map(
      (item) => item.candidate.ingredientIds,
    );

    expect(second).toEqual(first);
  });

  test("limit is applied after near-duplicate suppression", () => {
    const candidates = [
      candidate(["banana", "main_fruit"], ["water", "liquid"]),
      candidate(
        ["banana", "main_fruit"],
        ["water", "liquid"],
        ["cinnamon", "extra"],
      ),
      candidate(["mango", "main_fruit"], ["water", "liquid"]),
      candidate(["strawberry", "main_fruit"], ["oat_milk", "liquid"]),
    ];

    expect(
      rankGeneratedCandidates(candidates, {}, { limit: 2 }),
    ).toHaveLength(2);
  });
});
