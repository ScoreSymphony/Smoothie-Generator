import {
  loadBundledIngredientCatalog,
  type IngredientCatalog,
} from "@/data/ingredientCatalog";

export interface RecipeIngredient {
  readonly ingredientId: string;
  readonly amount: number;
  readonly unit: string;
}

export interface RecipeSubstitutionGroup {
  readonly targetId: string;
  readonly alternatives: readonly string[];
}

export interface Recipe {
  readonly id: string;
  readonly nameDe: string;
  readonly required: readonly RecipeIngredient[];
  readonly optional: readonly RecipeIngredient[];
  readonly substitutions: readonly RecipeSubstitutionGroup[];
  readonly instructionsDe: readonly string[];
  readonly tags: readonly string[];
}

export class RecipeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeValidationError";
  }
}

const CANONICAL_ID_PATTERN = /^[a-z0-9_]+$/;

function error(index: number, field: string, message: string): never {
  throw new RecipeValidationError(
    `Recipe at index ${index}, field "${field}": ${message}`,
  );
}

function requireRecord(
  value: unknown,
  index: number,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    error(index, field, "must be an object");
  }
  return value as Record<string, unknown>;
}

function requireString(
  value: unknown,
  index: number,
  field: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    error(index, field, "must be a non-empty string");
  }
  return value;
}

function requireStringArray(
  value: unknown,
  index: number,
  field: string,
  options: { nonEmpty?: boolean } = {},
): readonly string[] {
  if (!Array.isArray(value)) {
    error(index, field, "must be an array");
  }
  if (options.nonEmpty && value.length === 0) {
    error(index, field, "must contain at least one value");
  }

  const result = value.map((item, itemIndex) =>
    requireString(item, index, `${field}[${itemIndex}]`),
  );

  if (new Set(result).size !== result.length) {
    error(index, field, "must not contain duplicate values");
  }

  return Object.freeze(result);
}

function parseRecipeIngredient(
  value: unknown,
  recipeIndex: number,
  field: string,
  itemIndex: number,
  ingredients: IngredientCatalog,
): RecipeIngredient {
  const record = requireRecord(value, recipeIndex, `${field}[${itemIndex}]`);
  const ingredientId = requireString(
    record.ingredient_id,
    recipeIndex,
    `${field}[${itemIndex}].ingredient_id`,
  );
  if (!ingredients.resolve(ingredientId)) {
    error(
      recipeIndex,
      `${field}[${itemIndex}].ingredient_id`,
      `references unknown ingredient "${ingredientId}"`,
    );
  }

  const amount = record.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    error(
      recipeIndex,
      `${field}[${itemIndex}].amount`,
      "must be a positive finite number",
    );
  }

  const unit = requireString(
    record.unit,
    recipeIndex,
    `${field}[${itemIndex}].unit`,
  );

  return Object.freeze({ ingredientId, amount, unit });
}

function parseIngredientList(
  value: unknown,
  recipeIndex: number,
  field: "required" | "optional",
  ingredients: IngredientCatalog,
  nonEmpty: boolean,
): readonly RecipeIngredient[] {
  if (!Array.isArray(value)) {
    error(recipeIndex, field, "must be an array");
  }
  if (nonEmpty && value.length === 0) {
    error(recipeIndex, field, "must contain at least one ingredient");
  }

  const parsed = value.map((item, itemIndex) =>
    parseRecipeIngredient(item, recipeIndex, field, itemIndex, ingredients),
  );

  const ids = parsed.map((item) => item.ingredientId);
  if (new Set(ids).size !== ids.length) {
    error(recipeIndex, field, "must not contain duplicate ingredient IDs");
  }

  return Object.freeze(parsed);
}

function parseSubstitutions(
  value: unknown,
  recipeIndex: number,
  requiredIds: ReadonlySet<string>,
  ingredients: IngredientCatalog,
): readonly RecipeSubstitutionGroup[] {
  if (!Array.isArray(value)) {
    error(recipeIndex, "substitutions", "must be an array");
  }

  const groups = value.map((item, groupIndex) => {
    const record = requireRecord(
      item,
      recipeIndex,
      `substitutions[${groupIndex}]`,
    );
    const targetId = requireString(
      record.target_id,
      recipeIndex,
      `substitutions[${groupIndex}].target_id`,
    );

    if (!requiredIds.has(targetId)) {
      error(
        recipeIndex,
        `substitutions[${groupIndex}].target_id`,
        "must reference a required ingredient",
      );
    }

    const alternatives = requireStringArray(
      record.alternatives,
      recipeIndex,
      `substitutions[${groupIndex}].alternatives`,
      { nonEmpty: true },
    );

    for (const alternative of alternatives) {
      if (alternative === targetId) {
        error(
          recipeIndex,
          `substitutions[${groupIndex}].alternatives`,
          "must not contain the target ingredient itself",
        );
      }
      if (!ingredients.resolve(alternative)) {
        error(
          recipeIndex,
          `substitutions[${groupIndex}].alternatives`,
          `references unknown ingredient "${alternative}"`,
        );
      }
    }

    return Object.freeze({ targetId, alternatives });
  });

  const targets = groups.map((group) => group.targetId);
  if (new Set(targets).size !== targets.length) {
    error(
      recipeIndex,
      "substitutions",
      "must not contain duplicate target groups",
    );
  }

  return Object.freeze(groups);
}

export function parseRecipeRecord(
  value: unknown,
  index = 0,
  ingredients: IngredientCatalog = loadBundledIngredientCatalog(),
): Recipe {
  const record = requireRecord(value, index, "record");

  const id = requireString(record.id, index, "id");
  if (!CANONICAL_ID_PATTERN.test(id)) {
    error(
      index,
      "id",
      "must contain only lowercase ASCII letters, numbers and underscores",
    );
  }

  const nameDe = requireString(record.name_de, index, "name_de");
  const required = parseIngredientList(
    record.required,
    index,
    "required",
    ingredients,
    true,
  );
  const optional = parseIngredientList(
    record.optional ?? [],
    index,
    "optional",
    ingredients,
    false,
  );

  const requiredIds = new Set(required.map((item) => item.ingredientId));
  for (const optionalIngredient of optional) {
    if (requiredIds.has(optionalIngredient.ingredientId)) {
      error(
        index,
        "optional",
        `ingredient "${optionalIngredient.ingredientId}" is already required`,
      );
    }
  }

  const substitutions = parseSubstitutions(
    record.substitutions ?? [],
    index,
    requiredIds,
    ingredients,
  );

  const instructionsDe = requireStringArray(
    record.instructions_de,
    index,
    "instructions_de",
    { nonEmpty: true },
  );
  const tags = requireStringArray(record.tags ?? [], index, "tags");

  return Object.freeze({
    id,
    nameDe,
    required,
    optional,
    substitutions,
    instructionsDe,
    tags,
  });
}
