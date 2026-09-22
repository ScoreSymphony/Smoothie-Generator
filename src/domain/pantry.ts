import {
  loadBundledIngredientCatalog,
  normalizeIngredientTerm,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import type { Ingredient, IngredientCategory } from "@/domain/ingredients";

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

export interface PantryState {
  readonly selectedIds: readonly string[];
  readonly alwaysAvailableIds: readonly string[];
  readonly servings: number;
}

export interface ParsedPantryText {
  readonly resolvedIds: readonly string[];
  readonly unknownTerms: readonly string[];
}

export type PantryCategoryFilter = "all" | IngredientCategory;

export const DEFAULT_PANTRY_STATE: PantryState = Object.freeze({
  selectedIds: Object.freeze([]),
  alwaysAvailableIds: Object.freeze(["water", "ice"]),
  servings: 2,
});

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function canonicalize(
  values: readonly unknown[],
  catalog: IngredientCatalog,
): readonly string[] {
  const resolved: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const id = catalog.resolveId(value);
    if (id && !resolved.includes(id)) {
      resolved.push(id);
    }
  }

  return Object.freeze(resolved);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizePantryState(
  value: unknown,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): PantryState {
  if (!isRecord(value)) {
    return DEFAULT_PANTRY_STATE;
  }

  const selectedIds = canonicalize(
    Array.isArray(value.selectedIds) ? value.selectedIds : [],
    catalog,
  );
  const alwaysAvailableIds = canonicalize(
    Array.isArray(value.alwaysAvailableIds)
      ? value.alwaysAvailableIds
      : DEFAULT_PANTRY_STATE.alwaysAvailableIds,
    catalog,
  );

  const rawServings = value.servings;
  const servings =
    typeof rawServings === "number" &&
    Number.isInteger(rawServings) &&
    rawServings >= MIN_SERVINGS &&
    rawServings <= MAX_SERVINGS
      ? rawServings
      : DEFAULT_PANTRY_STATE.servings;

  return Object.freeze({
    selectedIds: unique(
      selectedIds.filter((id) => !alwaysAvailableIds.includes(id)),
    ),
    alwaysAvailableIds: unique(alwaysAvailableIds),
    servings,
  });
}

export function availableIngredientIds(state: PantryState): readonly string[] {
  return unique([...state.selectedIds, ...state.alwaysAvailableIds]);
}

export function setPantryServings(
  state: PantryState,
  servings: number,
): PantryState {
  const bounded = Math.max(
    MIN_SERVINGS,
    Math.min(MAX_SERVINGS, Math.round(servings)),
  );
  return Object.freeze({ ...state, servings: bounded });
}

export function toggleSelectedIngredient(
  state: PantryState,
  ingredientId: string,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): PantryState {
  const canonical = catalog.resolveId(ingredientId);
  if (!canonical || state.alwaysAvailableIds.includes(canonical)) {
    return state;
  }

  const selectedIds = state.selectedIds.includes(canonical)
    ? state.selectedIds.filter((id) => id !== canonical)
    : [...state.selectedIds, canonical];

  return Object.freeze({
    ...state,
    selectedIds: Object.freeze(selectedIds),
  });
}

export function addSelectedIngredients(
  state: PantryState,
  ingredientIds: readonly string[],
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): PantryState {
  const canonical = canonicalize(ingredientIds, catalog).filter(
    (id) => !state.alwaysAvailableIds.includes(id),
  );

  return Object.freeze({
    ...state,
    selectedIds: unique([...state.selectedIds, ...canonical]),
  });
}

export function toggleAlwaysAvailableIngredient(
  state: PantryState,
  ingredientId: string,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): PantryState {
  const canonical = catalog.resolveId(ingredientId);
  if (!canonical) {
    return state;
  }

  const isAlwaysAvailable = state.alwaysAvailableIds.includes(canonical);
  const alwaysAvailableIds = isAlwaysAvailable
    ? state.alwaysAvailableIds.filter((id) => id !== canonical)
    : [...state.alwaysAvailableIds, canonical];

  return Object.freeze({
    ...state,
    selectedIds: Object.freeze(
      state.selectedIds.filter((id) => id !== canonical),
    ),
    alwaysAvailableIds: unique(alwaysAvailableIds),
  });
}

const FREE_TEXT_SPLIT = /[,;\n]+/;

export function parsePantryFreeText(
  value: string,
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): ParsedPantryText {
  const resolvedIds: string[] = [];
  const unknownTerms: string[] = [];

  for (const rawTerm of value.split(FREE_TEXT_SPLIT)) {
    const term = rawTerm.trim();
    if (!term) {
      continue;
    }

    const ingredient = catalog.resolve(term);
    if (ingredient) {
      if (!resolvedIds.includes(ingredient.id)) {
        resolvedIds.push(ingredient.id);
      }
      continue;
    }

    if (!unknownTerms.includes(term)) {
      unknownTerms.push(term);
    }
  }

  return Object.freeze({
    resolvedIds: Object.freeze(resolvedIds),
    unknownTerms: Object.freeze(unknownTerms),
  });
}

export function filterPantryIngredients(
  ingredients: readonly Ingredient[],
  query: string,
  category: PantryCategoryFilter,
): readonly Ingredient[] {
  const normalizedQuery = normalizeIngredientTerm(query);

  return ingredients.filter((ingredient) => {
    if (category !== "all" && ingredient.category !== category) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const searchTerms = [
      ingredient.nameDe,
      ingredient.id,
      ...ingredient.aliases,
    ].map(normalizeIngredientTerm);

    return searchTerms.some((term) => term.includes(normalizedQuery));
  });
}
