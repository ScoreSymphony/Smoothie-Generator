import {
  INGREDIENT_CATEGORIES,
  IngredientValidationError,
} from "@/domain/ingredients";
import {
  createIngredientCatalog,
  loadBundledIngredientCatalog,
} from "@/data/ingredientCatalog";

function ingredient(overrides: Record<string, unknown> = {}) {
  return {
    id: "banana",
    name_de: "Banane",
    aliases: ["banana"],
    category: "fruit",
    subcategory: null,
    sweetness: 5,
    acidity: 0,
    bitterness: 0,
    creaminess: 5,
    intensity: 3,
    water_contribution: 2,
    roles: ["fruit", "creamy"],
    vegan: true,
    allergens: [],
    typical_amount: { min: 60, max: 150, unit: "g" },
    compatibility_tags: ["creamy", "tropical"],
    nutrition_per_100g: {},
    ...overrides,
  };
}

describe("bundled ingredient catalog", () => {
  test("loads the complete curated offline dataset", () => {
    const catalog = loadBundledIngredientCatalog();

    expect(catalog.size).toBe(119);
    expect(new Set(catalog.all().map((item) => item.category))).toEqual(
      new Set(INGREDIENT_CATEGORIES),
    );
  });

  test("resolves canonical IDs, German names and aliases case-insensitively", () => {
    const catalog = loadBundledIngredientCatalog();

    expect(catalog.resolveId("blueberry")).toBe("blueberry");
    expect(catalog.resolveId(" Heidelbeere ")).toBe("blueberry");
    expect(catalog.resolveId("HAFERMILCH")).toBe("oat_milk");
    expect(catalog.resolveId("Griechischer   Joghurt")).toBe("greek_yogurt");
  });

  test("returns undefined for unknown terms and throws on require", () => {
    const catalog = loadBundledIngredientCatalog();

    expect(catalog.resolve("does-not-exist")).toBeUndefined();
    expect(() => catalog.require("does-not-exist")).toThrow(
      IngredientValidationError,
    );
  });
});

describe("ingredient validation", () => {
  test("rejects duplicate canonical IDs", () => {
    expect(() =>
      createIngredientCatalog([
        ingredient(),
        ingredient({ name_de: "Andere Banane", aliases: ["other banana"] }),
      ]),
    ).toThrow(/Duplicate ingredient id: banana/);
  });

  test("rejects alias collisions between ingredients", () => {
    expect(() =>
      createIngredientCatalog([
        ingredient(),
        ingredient({
          id: "apple",
          name_de: "Apfel",
          aliases: ["BANANA"],
        }),
      ]),
    ).toThrow(/Duplicate ingredient alias\/name/);
  });

  test("rejects unsupported categories", () => {
    expect(() =>
      createIngredientCatalog([ingredient({ category: "vegetable" })]),
    ).toThrow(/must be one of/);
  });

  test("rejects flavor values outside the zero-to-five scale", () => {
    expect(() =>
      createIngredientCatalog([ingredient({ sweetness: 6 })]),
    ).toThrow(/sweetness.*0 to 5/);
  });

  test("rejects invalid amount ranges", () => {
    expect(() =>
      createIngredientCatalog([
        ingredient({ typical_amount: { min: 200, max: 100, unit: "g" } }),
      ]),
    ).toThrow(/0 <= min <= max/);
  });

  test("rejects empty roles and negative nutrition values", () => {
    expect(() =>
      createIngredientCatalog([ingredient({ roles: [] })]),
    ).toThrow(/roles.*at least one/);

    expect(() =>
      createIngredientCatalog([
        ingredient({ nutrition_per_100g: { calories: -1 } }),
      ]),
    ).toThrow(/must be non-negative/);
  });

  test("rejects non-canonical IDs", () => {
    expect(() =>
      createIngredientCatalog([ingredient({ id: "Green Apple" })]),
    ).toThrow(/lowercase ASCII letters/);
  });
});
