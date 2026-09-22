export const INGREDIENT_CATEGORIES = [
  "fruit",
  "berries",
  "liquid",
  "creamy_base",
  "greens",
  "protein",
  "sweetener",
  "nuts",
  "seeds",
  "spices",
  "boosters",
  "ice",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface AmountRange {
  readonly minimum: number;
  readonly maximum: number;
  readonly unit: string;
}

export interface Ingredient {
  readonly id: string;
  readonly nameDe: string;
  readonly aliases: readonly string[];
  readonly category: IngredientCategory;
  readonly subcategory: string | null;
  readonly sweetness: number;
  readonly acidity: number;
  readonly bitterness: number;
  readonly creaminess: number;
  readonly intensity: number;
  readonly waterContribution: number;
  readonly roles: readonly string[];
  readonly vegan: boolean;
  readonly allergens: readonly string[];
  readonly typicalAmount: AmountRange;
  readonly compatibilityTags: readonly string[];
  readonly nutritionPer100g: Readonly<Record<string, number>>;
}

export class IngredientValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngredientValidationError";
  }
}

const CATEGORY_SET = new Set<string>(INGREDIENT_CATEGORIES);
const CANONICAL_ID_PATTERN = /^[a-z0-9_]+$/;

function validationError(index: number, field: string, message: string): never {
  throw new IngredientValidationError(
    `Ingredient at index ${index}, field "${field}": ${message}`,
  );
}

function requireRecord(
  value: unknown,
  index: number,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    validationError(index, field, "must be an object");
  }
  return value as Record<string, unknown>;
}

function requireString(
  value: unknown,
  index: number,
  field: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    validationError(index, field, "must be a non-empty string");
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
    validationError(index, field, "must be an array");
  }
  if (options.nonEmpty && value.length === 0) {
    validationError(index, field, "must contain at least one value");
  }

  return Object.freeze(
    value.map((item, itemIndex) => {
      if (typeof item !== "string" || item.trim().length === 0) {
        validationError(index, `${field}[${itemIndex}]`, "must be a non-empty string");
      }
      return item;
    }),
  );
}

function requireScaleValue(
  value: unknown,
  index: number,
  field: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 5
  ) {
    validationError(index, field, "must be an integer from 0 to 5");
  }
  return value;
}

function requireFiniteNumber(
  value: unknown,
  index: number,
  field: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    validationError(index, field, "must be a finite number");
  }
  return value;
}

function parseTypicalAmount(
  value: unknown,
  index: number,
): AmountRange {
  const record = requireRecord(value, index, "typical_amount");
  const minimum = requireFiniteNumber(record.min, index, "typical_amount.min");
  const maximum = requireFiniteNumber(record.max, index, "typical_amount.max");
  const unit = requireString(record.unit, index, "typical_amount.unit");

  if (minimum < 0 || maximum <= 0 || minimum > maximum) {
    validationError(
      index,
      "typical_amount",
      "must satisfy 0 <= min <= max and max > 0",
    );
  }

  return Object.freeze({ minimum, maximum, unit });
}

function parseNutrition(
  value: unknown,
  index: number,
): Readonly<Record<string, number>> {
  const record = requireRecord(value ?? {}, index, "nutrition_per_100g");
  const nutrition: Record<string, number> = {};

  for (const [key, rawValue] of Object.entries(record)) {
    const nutrient = requireString(key, index, "nutrition_per_100g key");
    const amount = requireFiniteNumber(
      rawValue,
      index,
      `nutrition_per_100g.${nutrient}`,
    );
    if (amount < 0) {
      validationError(
        index,
        `nutrition_per_100g.${nutrient}`,
        "must be non-negative",
      );
    }
    nutrition[nutrient] = amount;
  }

  return Object.freeze(nutrition);
}

export function parseIngredientRecord(
  value: unknown,
  index = 0,
): Ingredient {
  const record = requireRecord(value, index, "record");

  const id = requireString(record.id, index, "id");
  if (!CANONICAL_ID_PATTERN.test(id)) {
    validationError(
      index,
      "id",
      "must contain only lowercase ASCII letters, numbers and underscores",
    );
  }

  const nameDe = requireString(record.name_de, index, "name_de");
  const aliases = requireStringArray(record.aliases ?? [], index, "aliases");

  const categoryValue = requireString(record.category, index, "category");
  if (!CATEGORY_SET.has(categoryValue)) {
    validationError(
      index,
      "category",
      `must be one of: ${INGREDIENT_CATEGORIES.join(", ")}`,
    );
  }

  let subcategory: string | null = null;
  if (record.subcategory !== null && record.subcategory !== undefined) {
    subcategory = requireString(record.subcategory, index, "subcategory");
  }

  if (typeof record.vegan !== "boolean") {
    validationError(index, "vegan", "must be a boolean");
  }

  const ingredient: Ingredient = {
    id,
    nameDe,
    aliases,
    category: categoryValue as IngredientCategory,
    subcategory,
    sweetness: requireScaleValue(record.sweetness, index, "sweetness"),
    acidity: requireScaleValue(record.acidity, index, "acidity"),
    bitterness: requireScaleValue(record.bitterness, index, "bitterness"),
    creaminess: requireScaleValue(record.creaminess, index, "creaminess"),
    intensity: requireScaleValue(record.intensity, index, "intensity"),
    waterContribution: requireScaleValue(
      record.water_contribution,
      index,
      "water_contribution",
    ),
    roles: requireStringArray(record.roles, index, "roles", { nonEmpty: true }),
    vegan: record.vegan,
    allergens: requireStringArray(
      record.allergens ?? [],
      index,
      "allergens",
    ),
    typicalAmount: parseTypicalAmount(record.typical_amount, index),
    compatibilityTags: requireStringArray(
      record.compatibility_tags ?? [],
      index,
      "compatibility_tags",
    ),
    nutritionPer100g: parseNutrition(record.nutrition_per_100g ?? {}, index),
  };

  return Object.freeze(ingredient);
}
