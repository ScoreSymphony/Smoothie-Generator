import { createRecipeCatalog, loadBundledRecipeCatalog } from "@/data/recipeCatalog";
import { RecipeValidationError } from "@/domain/recipes";

function recipe(overrides: Record<string, unknown> = {}) {
  return {
    id: "test_recipe",
    name_de: "Test-Rezept",
    required: [
      { ingredient_id: "banana", amount: 100, unit: "g" },
      { ingredient_id: "oat_milk", amount: 200, unit: "ml" },
    ],
    optional: [{ ingredient_id: "cinnamon", amount: 0.5, unit: "TL" }],
    substitutions: [
      { target_id: "oat_milk", alternatives: ["almond_milk", "water"] },
    ],
    instructions_de: ["Alles mixen."],
    tags: ["test"],
    ...overrides,
  };
}

describe("bundled recipe catalog", () => {
  test("loads the complete curated 80-recipe corpus offline", () => {
    const catalog = loadBundledRecipeCatalog();

    expect(catalog.size).toBe(80);
    expect(catalog.require("strawberry_banana").nameDe).toBe("Erdbeer-Banane");
    expect(catalog.require("mn_wild_nature").required.length).toBeGreaterThan(0);
  });
});

describe("recipe validation", () => {
  test("rejects duplicate recipe IDs", () => {
    expect(() => createRecipeCatalog([recipe(), recipe()])).toThrow(
      /Duplicate recipe id/,
    );
  });

  test("rejects unknown ingredient references", () => {
    expect(() =>
      createRecipeCatalog([
        recipe({
          required: [
            { ingredient_id: "does_not_exist", amount: 1, unit: "g" },
          ],
        }),
      ]),
    ).toThrow(/unknown ingredient/);
  });

  test("rejects invalid amounts and duplicated ingredients", () => {
    expect(() =>
      createRecipeCatalog([
        recipe({
          required: [{ ingredient_id: "banana", amount: 0, unit: "g" }],
        }),
      ]),
    ).toThrow(/positive finite number/);

    expect(() =>
      createRecipeCatalog([
        recipe({
          required: [
            { ingredient_id: "banana", amount: 1, unit: "g" },
            { ingredient_id: "banana", amount: 2, unit: "g" },
          ],
        }),
      ]),
    ).toThrow(/duplicate ingredient IDs/);
  });

  test("rejects substitution groups that do not target required ingredients", () => {
    expect(() =>
      createRecipeCatalog([
        recipe({
          substitutions: [
            { target_id: "cinnamon", alternatives: ["vanilla"] },
          ],
        }),
      ]),
    ).toThrow(/must reference a required ingredient/);
  });

  test("rejects unknown substitution alternatives", () => {
    expect(() =>
      createRecipeCatalog([
        recipe({
          substitutions: [
            { target_id: "oat_milk", alternatives: ["does_not_exist"] },
          ],
        }),
      ]),
    ).toThrow(RecipeValidationError);
  });
});
