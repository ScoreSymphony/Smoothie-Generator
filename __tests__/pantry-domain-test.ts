import { loadBundledIngredientCatalog } from "@/data/ingredientCatalog";
import {
  DEFAULT_PANTRY_STATE,
  addSelectedIngredients,
  availableIngredientIds,
  filterPantryIngredients,
  parsePantryFreeText,
  sanitizePantryState,
  setPantryServings,
  toggleAlwaysAvailableIngredient,
  toggleSelectedIngredient,
} from "@/domain/pantry";

const catalog = loadBundledIngredientCatalog();

describe("pantry domain state", () => {
  test("sanitizes persisted aliases, duplicates, unknown IDs and servings", () => {
    const state = sanitizePantryState({
      selectedIds: ["banana", "BANANA", "Heidelbeere", "unknown"],
      alwaysAvailableIds: ["Wasser", "ice", "water"],
      servings: 4,
    });

    expect(state).toEqual({
      selectedIds: ["banana", "blueberry"],
      alwaysAvailableIds: ["water", "ice"],
      servings: 4,
    });
  });

  test("falls back safely for malformed persisted state", () => {
    expect(sanitizePantryState(null)).toBe(DEFAULT_PANTRY_STATE);
    expect(
      sanitizePantryState({
        selectedIds: "banana",
        alwaysAvailableIds: 123,
        servings: 99,
      }),
    ).toEqual(DEFAULT_PANTRY_STATE);
  });

  test("adds and toggles canonical selected ingredients without duplicates", () => {
    let state = addSelectedIngredients(DEFAULT_PANTRY_STATE, [
      "Banane",
      "banana",
      "Hafermilch",
    ]);

    expect(state.selectedIds).toEqual(["banana", "oat_milk"]);

    state = toggleSelectedIngredient(state, "banana");
    expect(state.selectedIds).toEqual(["oat_milk"]);

    state = toggleSelectedIngredient(state, "water");
    expect(state.selectedIds).toEqual(["oat_milk"]);
  });

  test("configures basics as always available and deduplicates availability", () => {
    let state = sanitizePantryState({
      selectedIds: ["banana", "oat_milk"],
      alwaysAvailableIds: [],
      servings: 2,
    });

    state = toggleAlwaysAvailableIngredient(state, "Hafermilch");
    expect(state.selectedIds).toEqual(["banana"]);
    expect(state.alwaysAvailableIds).toEqual(["oat_milk"]);
    expect(availableIngredientIds(state)).toEqual(["banana", "oat_milk"]);
  });

  test("bounds servings to the supported mobile range", () => {
    expect(setPantryServings(DEFAULT_PANTRY_STATE, 0).servings).toBe(1);
    expect(setPantryServings(DEFAULT_PANTRY_STATE, 99).servings).toBe(12);
  });
});

describe("pantry input helpers", () => {
  test("parses aliases and reports unknown free-text terms without throwing", () => {
    expect(
      parsePantryFreeText("Banane, Heidelbeere; Hafermilch\nMystery"),
    ).toEqual({
      resolvedIds: ["banana", "blueberry", "oat_milk"],
      unknownTerms: ["Mystery"],
    });
  });

  test("filters by search text and category", () => {
    const all = catalog.all();

    expect(
      filterPantryIngredients(all, "Heidel", "all").map((item) => item.id),
    ).toEqual(["blueberry"]);

    const liquids = filterPantryIngredients(all, "", "liquid");
    expect(liquids.length).toBeGreaterThan(0);
    expect(liquids.every((item) => item.category === "liquid")).toBe(true);
  });
});
