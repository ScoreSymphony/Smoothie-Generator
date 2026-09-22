import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";
import type { Ingredient } from "@/domain/ingredients";

export const EXHAUSTIVE_COMBINATION_LIMIT = 50_000;
export const MAX_COMBINATION_EVALUATIONS = 50_000;

export type GeneratedSmoothieRole =
  | "main_fruit"
  | "liquid"
  | "creamy_base"
  | "protein"
  | "sweetener"
  | "extra";

export interface GeneratedSmoothieRoleAssignment {
  readonly ingredientId: string;
  readonly role: GeneratedSmoothieRole;
}

export interface GeneratedSmoothie {
  readonly ingredientIds: readonly string[];
  readonly roles: readonly GeneratedSmoothieRoleAssignment[];
  readonly missingIngredientIds: readonly string[];
}

export interface SmoothieGenerationOptions {
  readonly count?: number;
  readonly seed?: number;
  readonly vegan?: boolean;
  readonly excludedAllergens?: readonly string[];
  readonly excludedIngredientIds?: readonly string[];
  readonly missingIngredientMode?: "none" | "one";
}

interface CoreCandidate {
  readonly ingredientIds: readonly string[];
  readonly roles: readonly GeneratedSmoothieRoleAssignment[];
}

interface GenerationPools {
  readonly fruitGroups: readonly (readonly Ingredient[])[];
  readonly liquids: readonly Ingredient[];
  readonly creamy: readonly (Ingredient | null)[];
  readonly proteins: readonly (Ingredient | null)[];
  readonly sweeteners: readonly (Ingredient | null)[];
  readonly extras: readonly (Ingredient | null)[];
}

const GENERATABLE_EXTRA_CATEGORIES = new Set([
  "boosters",
  "spices",
  "seeds",
  "greens",
  "nuts",
]);

const GENERATABLE_CATEGORIES = new Set([
  "fruit",
  "berries",
  "liquid",
  "creamy_base",
  "protein",
  "sweetener",
  ...GENERATABLE_EXTRA_CATEGORIES,
]);

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: readonly T[], seed: number): T[] {
  const result = [...values];
  const random = createSeededRandom(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function sampleUniqueIndices(
  total: number,
  count: number,
  seed: number,
): readonly number[] {
  if (count >= total) {
    return Object.freeze(Array.from({ length: total }, (_, index) => index));
  }

  const random = createSeededRandom(seed);
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(random() * total));
  }
  return Object.freeze([...indices]);
}

function ingredientAllowed(
  ingredient: Ingredient,
  vegan: boolean,
  excludedAllergens: ReadonlySet<string>,
  excludedIngredientIds: ReadonlySet<string>,
): boolean {
  if (excludedIngredientIds.has(ingredient.id)) {
    return false;
  }
  if (vegan && !ingredient.vegan) {
    return false;
  }
  return !ingredient.allergens.some((allergen) =>
    excludedAllergens.has(allergen),
  );
}

function canonicalPantryIngredients(
  pantryIds: readonly string[],
  catalog: IngredientCatalog,
  vegan: boolean,
  excludedAllergens: ReadonlySet<string>,
  excludedIngredientIds: ReadonlySet<string>,
): readonly Ingredient[] {
  const ids = new Set<string>();
  const result: Ingredient[] = [];

  for (const value of pantryIds) {
    const ingredient = catalog.resolve(value);
    if (!ingredient || ids.has(ingredient.id)) {
      continue;
    }
    ids.add(ingredient.id);
    if (
      ingredientAllowed(
        ingredient,
        vegan,
        excludedAllergens,
        excludedIngredientIds,
      )
    ) {
      result.push(ingredient);
    }
  }

  return Object.freeze(
    result.sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    ),
  );
}

function combinationsOfOneOrTwo(
  ingredients: readonly Ingredient[],
): readonly (readonly Ingredient[])[] {
  const groups: Ingredient[][] = ingredients.map((ingredient) => [ingredient]);

  for (let left = 0; left < ingredients.length; left += 1) {
    for (let right = left + 1; right < ingredients.length; right += 1) {
      groups.push([ingredients[left], ingredients[right]]);
    }
  }

  return Object.freeze(groups.map((group) => Object.freeze(group)));
}

function createPools(allowed: readonly Ingredient[]): GenerationPools | undefined {
  const fruits = allowed.filter(
    (ingredient) =>
      ingredient.category === "fruit" || ingredient.category === "berries",
  );
  const liquids = allowed.filter(
    (ingredient) => ingredient.category === "liquid",
  );

  if (fruits.length === 0 || liquids.length === 0) {
    return undefined;
  }

  return {
    fruitGroups: combinationsOfOneOrTwo(fruits),
    liquids: Object.freeze(liquids),
    creamy: Object.freeze([
      null,
      ...allowed.filter((ingredient) => ingredient.category === "creamy_base"),
    ]),
    proteins: Object.freeze([
      null,
      ...allowed.filter((ingredient) => ingredient.category === "protein"),
    ]),
    sweeteners: Object.freeze([
      null,
      ...allowed.filter((ingredient) => ingredient.category === "sweetener"),
    ]),
    extras: Object.freeze([
      null,
      ...allowed.filter((ingredient) =>
        GENERATABLE_EXTRA_CATEGORIES.has(ingredient.category),
      ),
    ]),
  };
}

function poolLengths(pools: GenerationPools): readonly number[] {
  return Object.freeze([
    pools.fruitGroups.length,
    pools.liquids.length,
    pools.creamy.length,
    pools.proteins.length,
    pools.sweeteners.length,
    pools.extras.length,
  ]);
}

function totalCombinations(pools: GenerationPools): number {
  return poolLengths(pools).reduce((total, size) => total * size, 1);
}

function decodeCombinationIndex(
  index: number,
  lengths: readonly number[],
): readonly number[] {
  const offsets = new Array<number>(lengths.length);
  let remainder = index;

  for (let position = lengths.length - 1; position >= 0; position -= 1) {
    const size = lengths[position];
    offsets[position] = remainder % size;
    remainder = Math.floor(remainder / size);
  }

  return offsets;
}

function hasCompatibilityConflict(chosen: readonly Ingredient[]): boolean {
  const ids = new Set(chosen.map((ingredient) => ingredient.id));

  return chosen.some((ingredient) =>
    ingredient.compatibilityTags.some(
      (tag) => tag.startsWith("avoid:") && ids.has(tag.slice("avoid:".length)),
    ),
  );
}

function validCandidate(
  chosen: readonly Ingredient[],
  liquid: Ingredient,
): boolean {
  if (liquid.waterContribution < 3) {
    return false;
  }

  if (chosen.filter((ingredient) => ingredient.intensity >= 5).length > 1) {
    return false;
  }

  if (new Set(chosen.map((ingredient) => ingredient.id)).size !== chosen.length) {
    return false;
  }

  return !hasCompatibilityConflict(chosen);
}

function candidateFromOffsets(
  pools: GenerationPools,
  offsets: readonly number[],
): CoreCandidate | undefined {
  const fruitGroup = pools.fruitGroups[offsets[0]];
  const liquid = pools.liquids[offsets[1]];
  const creamy = pools.creamy[offsets[2]];
  const protein = pools.proteins[offsets[3]];
  const sweetener = pools.sweeteners[offsets[4]];
  const extra = pools.extras[offsets[5]];

  const optional = [creamy, protein, sweetener, extra].filter(
    (ingredient): ingredient is Ingredient => ingredient !== null,
  );
  const chosen = [...fruitGroup, liquid, ...optional];

  if (!validCandidate(chosen, liquid)) {
    return undefined;
  }

  const roles: GeneratedSmoothieRoleAssignment[] = [
    ...fruitGroup.map((ingredient) =>
      Object.freeze({
        ingredientId: ingredient.id,
        role: "main_fruit" as const,
      }),
    ),
    Object.freeze({
      ingredientId: liquid.id,
      role: "liquid" as const,
    }),
  ];

  for (const [ingredient, role] of [
    [creamy, "creamy_base"],
    [protein, "protein"],
    [sweetener, "sweetener"],
    [extra, "extra"],
  ] as const) {
    if (ingredient) {
      roles.push(
        Object.freeze({
          ingredientId: ingredient.id,
          role,
        }),
      );
    }
  }

  return Object.freeze({
    ingredientIds: Object.freeze(chosen.map((ingredient) => ingredient.id)),
    roles: Object.freeze(roles),
  });
}

function candidateKey(candidate: CoreCandidate): string {
  return candidate.ingredientIds.join("|");
}

function coreGenerate(
  allowed: readonly Ingredient[],
  count: number,
  seed: number,
  requiredIngredientId?: string,
): readonly CoreCandidate[] {
  const pools = createPools(allowed);
  if (!pools || count <= 0) {
    return Object.freeze([]);
  }

  const total = totalCombinations(pools);
  const lengths = poolLengths(pools);
  const seen = new Set<string>();
  const candidates: CoreCandidate[] = [];

  if (total <= EXHAUSTIVE_COMBINATION_LIMIT) {
    for (let index = 0; index < total; index += 1) {
      const candidate = candidateFromOffsets(
        pools,
        decodeCombinationIndex(index, lengths),
      );
      if (
        !candidate ||
        (requiredIngredientId &&
          !candidate.ingredientIds.includes(requiredIngredientId))
      ) {
        continue;
      }

      const key = candidateKey(candidate);
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push(candidate);
      }
    }

    const ordered = candidates.sort((left, right) => {
      const leftKey = candidateKey(left);
      const rightKey = candidateKey(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
    return Object.freeze(shuffle(ordered, seed).slice(0, count));
  }

  const evaluationBudget = Math.min(
    total,
    MAX_COMBINATION_EVALUATIONS,
    Math.max(2_000, count * 40),
  );

  for (const index of sampleUniqueIndices(total, evaluationBudget, seed)) {
    const candidate = candidateFromOffsets(
      pools,
      decodeCombinationIndex(index, lengths),
    );
    if (
      !candidate ||
      (requiredIngredientId &&
        !candidate.ingredientIds.includes(requiredIngredientId))
    ) {
      continue;
    }

    const key = candidateKey(candidate);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    candidates.push(candidate);
    if (candidates.length >= count) {
      break;
    }
  }

  return Object.freeze(candidates);
}

function finalizeCandidate(
  candidate: CoreCandidate,
  missingIngredientIds: readonly string[],
): GeneratedSmoothie {
  return Object.freeze({
    ingredientIds: candidate.ingredientIds,
    roles: candidate.roles,
    missingIngredientIds: Object.freeze([...missingIngredientIds]),
  });
}

export function generateSmoothies(
  pantryIds: readonly string[],
  options: SmoothieGenerationOptions = {},
  catalog: IngredientCatalog = loadBundledIngredientCatalog(),
): readonly GeneratedSmoothie[] {
  const count = Math.max(0, Math.floor(options.count ?? 5));
  if (count === 0) {
    return Object.freeze([]);
  }

  const seed = Number.isFinite(options.seed) ? Math.trunc(options.seed ?? 0) : 0;
  const vegan = options.vegan ?? false;
  const excludedAllergens = new Set(options.excludedAllergens ?? []);
  const excludedIngredientIds = new Set(
    (options.excludedIngredientIds ?? [])
      .map((value) => catalog.resolveId(value))
      .filter((value): value is string => Boolean(value)),
  );
  const missingIngredientMode = options.missingIngredientMode ?? "none";

  const allowed = canonicalPantryIngredients(
    pantryIds,
    catalog,
    vegan,
    excludedAllergens,
    excludedIngredientIds,
  );
  const strict = coreGenerate(allowed, count, seed).map((candidate) =>
    finalizeCandidate(candidate, []),
  );

  if (missingIngredientMode === "none" || strict.length >= count) {
    return Object.freeze(strict.slice(0, count));
  }

  const pantryIdSet = new Set(allowed.map((ingredient) => ingredient.id));
  const result: GeneratedSmoothie[] = [...strict];
  const seen = new Set(result.map((candidate) => candidate.ingredientIds.join("|")));

  const possibleMissing = catalog
    .all()
    .filter(
      (ingredient) =>
        !pantryIdSet.has(ingredient.id) &&
        GENERATABLE_CATEGORIES.has(ingredient.category) &&
        ingredientAllowed(
          ingredient,
          vegan,
          excludedAllergens,
          excludedIngredientIds,
        ),
    )
    .sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );

  for (const missing of possibleMissing) {
    if (result.length >= count) {
      break;
    }

    const augmented = Object.freeze(
      [...allowed, missing].sort((left, right) =>
        left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
      ),
    );
    const missingSeed = (seed ^ hashString(missing.id)) >>> 0;
    const candidates = coreGenerate(
      augmented,
      Math.min(4, count - result.length),
      missingSeed,
      missing.id,
    );

    for (const candidate of candidates) {
      const key = candidate.ingredientIds.join("|");
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(finalizeCandidate(candidate, [missing.id]));
      if (result.length >= count) {
        break;
      }
    }
  }

  return Object.freeze(result.slice(0, count));
}
