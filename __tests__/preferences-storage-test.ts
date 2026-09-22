import { getDatabase, initializeDatabase } from "@/storage/database";
import {
  PREFERENCES_SCHEMA_VERSION,
  PREFERENCES_STORAGE_KEY,
  decodePreferencesState,
  loadUserPreferences,
  resetUserPreferences,
  saveUserPreferences,
} from "@/storage/preferencesStorage";
import { sanitizeUserPreferences } from "@/domain/preferences";

jest.mock("@/storage/database", () => ({
  getDatabase: jest.fn(),
  initializeDatabase: jest.fn(),
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockedInitializeDatabase =
  initializeDatabase as jest.MockedFunction<typeof initializeDatabase>;

describe("versioned preference persistence", () => {
  const getFirstAsync = jest.fn();
  const runAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getFirstAsync.mockReset();
    runAsync.mockReset();
    mockedInitializeDatabase.mockResolvedValue(undefined);
    mockedGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
    } as never);
  });

  test("favorites, restrictions and feedback survive a reload", async () => {
    const preferences = sanitizeUserPreferences({
      favoriteIngredientIds: ["mango"],
      favoriteRecipeKeys: ["stored:tropical"],
      excludedIngredientIds: ["honey"],
      allergies: ["nuts"],
      vegan: true,
      vegetarian: true,
      dairyFree: true,
      desiredSweetness: 3,
      desiredCreaminess: 2,
      refreshing: true,
      postWorkout: true,
      feedback: {
        "stored:tropical": "liked",
      },
    });

    await saveUserPreferences(preferences);

    const storedJson = JSON.parse(
      runAsync.mock.calls[0][2] as string,
    );
    expect(storedJson.version).toBe(PREFERENCES_SCHEMA_VERSION);

    getFirstAsync.mockResolvedValue({
      value: JSON.stringify(storedJson),
    });

    await expect(loadUserPreferences()).resolves.toEqual(preferences);
  });

  test("unversioned legacy data is migrated and rewritten", async () => {
    getFirstAsync.mockResolvedValue({
      value: JSON.stringify({
        favorite_ingredients: ["Mango"],
        dairy_free: true,
        desired_sweetness: 4,
        feedback: {
          "stored:test": "neutral",
        },
      }),
    });

    const loaded = await loadUserPreferences();

    expect(loaded.favoriteIngredientIds).toEqual(["mango"]);
    expect(loaded.dairyFree).toBe(true);
    expect(loaded.desiredSweetness).toBe(4);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO app_meta"),
      PREFERENCES_STORAGE_KEY,
      expect.stringContaining(`"version":${PREFERENCES_SCHEMA_VERSION}`),
    );
  });

  test("decoder rejects future schemas instead of guessing", () => {
    expect(() =>
      decodePreferencesState({
        version: PREFERENCES_SCHEMA_VERSION + 1,
        data: {},
      }),
    ).toThrow(/Unsupported preferences schema version/);
  });

  test("malformed JSON safely falls back to defaults", async () => {
    getFirstAsync.mockResolvedValue({ value: "{" });

    const loaded = await loadUserPreferences();

    expect(loaded.favoriteIngredientIds).toEqual([]);
    expect(loaded.feedback).toEqual({});
  });

  test("reset deletes only the preference state", async () => {
    await resetUserPreferences();

    expect(runAsync).toHaveBeenCalledWith(
      "DELETE FROM app_meta WHERE key = ?",
      PREFERENCES_STORAGE_KEY,
    );
  });
});
