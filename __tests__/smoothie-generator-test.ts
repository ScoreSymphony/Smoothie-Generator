import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import { generateSmoothies } from "@/domain/smoothieGenerator";

describe("rule-based smoothie generator", () => {
  test("generates multiple distinct structured candidates from the available pantry", () => {
    const pantry = [
      "banana",
      "strawberry",
      "mango",
      "oat_milk",
      "water",
      "yogurt",
      "protein_powder",
      "honey",
      "cinnamon",
    ];

    const result = generateSmoothies(pantry, { count: 4, seed: 7 });

    expect(result).toHaveLength(4);
    expect(new Set(result.map((candidate) => candidate.ingredientIds.join("|"))).size).toBe(4);
    expect(
      result.every((candidate) =>
        candidate.ingredientIds.every((id) => pantry.includes(id)),
      ),
    ).toBe(true);
    expect(
      result.every((candidate) =>
        candidate.roles.some((assignment) => assignment.role === "liquid") &&
        candidate.roles.some((assignment) => assignment.role === "main_fruit"),
      ),
    ).toBe(true);
  });

  test("same seed is deterministic and pantry order independent", () => {
    const pantry = [
      "banana",
      "strawberry",
      "mango",
      "oat_milk",
      "water",
      "honey",
      "cinnamon",
    ];

    expect(generateSmoothies(pantry, { count: 5, seed: 42 })).toEqual(
      generateSmoothies([...pantry].reverse(), { count: 5, seed: 42 }),
    );
  });

  test("strict mode never invents unavailable ingredients", () => {
    const pantry = ["banana", "strawberry", "water"];
    const result = generateSmoothies(pantry, { count: 20, seed: 1 });

    expect(
      result.every((candidate) =>
        candidate.ingredientIds.every((id) => pantry.includes(id)),
      ),
    ).toBe(true);
    expect(result.every((candidate) => candidate.missingIngredientIds.length === 0)).toBe(true);
  });

  test("insufficient strict pantry returns no candidates", () => {
    expect(
      generateSmoothies(["banana", "strawberry"], { seed: 1 }),
    ).toEqual([]);
  });

  test("explicit one-missing mode can suggest exactly one unavailable ingredient", () => {
    const pantry = ["banana", "strawberry"];
    const result = generateSmoothies(pantry, {
      count: 4,
      seed: 11,
      missingIngredientMode: "one",
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((candidate) => candidate.missingIngredientIds.length === 1)).toBe(true);
    expect(
      result.every((candidate) => {
        const allowed = new Set([...pantry, ...candidate.missingIngredientIds]);
        return candidate.ingredientIds.every((id) => allowed.has(id));
      }),
    ).toBe(true);
  });

  test("vegan filter excludes dairy", () => {
    const result = generateSmoothies(
      ["banana", "strawberry", "oat_milk", "yogurt", "coconut_yogurt"],
      { count: 20, seed: 2, vegan: true },
    );

    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((candidate) => !candidate.ingredientIds.includes("yogurt")),
    ).toBe(true);
  });

  test("allergen filter excludes matching ingredients", () => {
    const result = generateSmoothies(
      ["banana", "strawberry", "oat_milk", "peanut_butter", "water"],
      { count: 20, seed: 3, excludedAllergens: ["peanuts"] },
    );

    expect(
      result.every(
        (candidate) => !candidate.ingredientIds.includes("peanut_butter"),
      ),
    ).toBe(true);
  });

  test("supports valid two-fruit smoothies and nuts as extras", () => {
    const fruitResult = generateSmoothies(
      ["banana", "strawberry", "water"],
      { count: 20, seed: 1 },
    );
    expect(
      fruitResult.some(
        (candidate) =>
          new Set(candidate.ingredientIds).size === 3 &&
          candidate.ingredientIds.includes("banana") &&
          candidate.ingredientIds.includes("strawberry") &&
          candidate.ingredientIds.includes("water"),
      ),
    ).toBe(true);

    const nutResult = generateSmoothies(
      ["banana", "water", "walnuts"],
      { count: 10, seed: 4 },
    );
    expect(
      nutResult.some((candidate) => candidate.ingredientIds.includes("walnuts")),
    ).toBe(true);
  });

  test("full curated pantry generation stays bounded and produces unique results", () => {
    const catalog = loadBundledIngredientCatalog();
    const pantry = catalog.all().map((ingredient) => ingredient.id);
    const result = generateSmoothies(pantry, { count: 20, seed: 17 });

    expect(result).toHaveLength(20);
    expect(new Set(result.map((candidate) => candidate.ingredientIds.join("|"))).size).toBe(20);
    expect(
      result.every((candidate) =>
        candidate.ingredientIds.every((id) => pantry.includes(id)),
      ),
    ).toBe(true);
  });
});
