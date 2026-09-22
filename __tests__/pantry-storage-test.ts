import { getDatabase, initializeDatabase } from "@/storage/database";
import {
  loadPantryState,
  resetPantryState,
  savePantryState,
} from "@/storage/pantryStorage";

jest.mock("@/storage/database", () => ({
  getDatabase: jest.fn(),
  initializeDatabase: jest.fn(),
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockedInitializeDatabase =
  initializeDatabase as jest.MockedFunction<typeof initializeDatabase>;

describe("pantry persistence", () => {
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

  test("restores and sanitizes persisted pantry state", async () => {
    getFirstAsync.mockResolvedValue({
      value: JSON.stringify({
        selectedIds: ["Heidelbeere", "unknown"],
        alwaysAvailableIds: ["water"],
        servings: 3,
      }),
    });

    await expect(loadPantryState()).resolves.toEqual({
      selectedIds: ["blueberry"],
      alwaysAvailableIds: ["water"],
      servings: 3,
    });
  });

  test("falls back to defaults when persisted JSON is malformed", async () => {
    getFirstAsync.mockResolvedValue({ value: "{" });

    await expect(loadPantryState()).resolves.toEqual({
      selectedIds: [],
      alwaysAvailableIds: ["water", "ice"],
      servings: 2,
    });
  });

  test("stores pantry state in the on-device app_meta table", async () => {
    await savePantryState({
      selectedIds: ["banana"],
      alwaysAvailableIds: ["water"],
      servings: 2,
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO app_meta"),
      "pantry_state_v1",
      JSON.stringify({
        selectedIds: ["banana"],
        alwaysAvailableIds: ["water"],
        servings: 2,
      }),
    );
  });

  test("can reset only the pantry state", async () => {
    await resetPantryState();

    expect(runAsync).toHaveBeenCalledWith(
      "DELETE FROM app_meta WHERE key = ?",
      "pantry_state_v1",
    );
  });
});
