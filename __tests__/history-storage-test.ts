import { getDatabase, initializeDatabase } from "@/storage/database";
import {
  addRecommendationToHistory,
  clearRecipeHistory,
  loadRecipeHistory,
} from "@/storage/historyStorage";
import type { RecommendationView } from "@/domain/recommendations";

jest.mock("@/storage/database", () => ({
  getDatabase: jest.fn(),
  initializeDatabase: jest.fn(),
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockedInitializeDatabase =
  initializeDatabase as jest.MockedFunction<typeof initializeDatabase>;

const recommendation: RecommendationView = {
  key: "stored:strawberry_banana",
  source: "stored",
  title: "Erdbeer-Banane",
  ingredientIds: ["banana", "strawberry", "oat_milk"],
  ingredients: [],
  nutrition: {
    calories: 0,
    proteinG: 0,
    carbohydratesG: 0,
    sugarG: 0,
    fatG: 0,
    fiberG: 0,
  },
  availabilityLabel: "Alles vorhanden",
  missingIngredientIds: [],
  substitutionLabels: [],
  tags: [],
  instructions: ["Mixen"],
};

describe("recipe history persistence", () => {
  const getFirstAsync = jest.fn();
  const runAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getFirstAsync.mockReset();
    runAsync.mockReset();
    mockedInitializeDatabase.mockResolvedValue(undefined);
    mockedGetDatabase.mockResolvedValue({ getFirstAsync, runAsync } as never);
  });

  test("loads valid entries and ignores malformed rows", async () => {
    getFirstAsync.mockResolvedValue({
      value: JSON.stringify([
        {
          recipeKey: "stored:test",
          title: "Test",
          source: "stored",
          ingredientIds: ["banana"],
          viewedAt: "2026-09-22T12:00:00.000Z",
        },
        { broken: true },
      ]),
    });

    const loaded = await loadRecipeHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].recipeKey).toBe("stored:test");
  });

  test("adds most recent entry first and deduplicates the same recipe", async () => {
    getFirstAsync.mockResolvedValue({
      value: JSON.stringify([
        {
          recipeKey: recommendation.key,
          title: recommendation.title,
          source: "stored",
          ingredientIds: recommendation.ingredientIds,
          viewedAt: "2026-09-22T10:00:00.000Z",
        },
        {
          recipeKey: "stored:other",
          title: "Andere",
          source: "stored",
          ingredientIds: ["mango"],
          viewedAt: "2026-09-22T09:00:00.000Z",
        },
      ]),
    });

    await addRecommendationToHistory(
      recommendation,
      "2026-09-22T13:00:00.000Z",
    );

    const saved = JSON.parse(runAsync.mock.calls[0][2] as string);
    expect(saved).toHaveLength(2);
    expect(saved[0].recipeKey).toBe(recommendation.key);
    expect(saved[0].viewedAt).toBe("2026-09-22T13:00:00.000Z");
    expect(saved[1].recipeKey).toBe("stored:other");
  });

  test("history can be cleared independently", async () => {
    await clearRecipeHistory();
    expect(runAsync).toHaveBeenCalledWith(
      "DELETE FROM app_meta WHERE key = ?",
      "recipe_history_v1",
    );
  });
});
