import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RecipeScreen from "@/app/recipe";
import { DEFAULT_USER_PREFERENCES } from "@/domain/preferences";
import { addRecommendationToHistory } from "@/storage/historyStorage";
import { loadPantryState } from "@/storage/pantryStorage";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "@/storage/preferencesStorage";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ key: "stored:strawberry_banana" }),
}));

jest.mock("@/storage/pantryStorage", () => ({
  loadPantryState: jest.fn(),
}));

jest.mock("@/storage/preferencesStorage", () => ({
  loadUserPreferences: jest.fn(),
  saveUserPreferences: jest.fn(),
}));

jest.mock("@/storage/historyStorage", () => ({
  addRecommendationToHistory: jest.fn(),
}));

const mockedPantry = loadPantryState as jest.MockedFunction<typeof loadPantryState>;
const mockedPreferences =
  loadUserPreferences as jest.MockedFunction<typeof loadUserPreferences>;
const mockedSave = saveUserPreferences as jest.MockedFunction<typeof saveUserPreferences>;
const mockedHistory =
  addRecommendationToHistory as jest.MockedFunction<typeof addRecommendationToHistory>;

describe("<RecipeScreen />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPantry.mockResolvedValue({
      selectedIds: ["banana", "strawberry", "oat_milk"],
      alwaysAvailableIds: ["water", "ice"],
      servings: 2,
    });
    mockedPreferences.mockResolvedValue(DEFAULT_USER_PREFERENCES);
    mockedSave.mockResolvedValue(undefined);
    mockedHistory.mockResolvedValue({
      recipeKey: "stored:strawberry_banana",
      title: "Erdbeer-Banane",
      source: "stored",
      ingredientIds: ["banana", "strawberry", "oat_milk"],
      viewedAt: "2026-09-22T12:00:00.000Z",
    });
  });

  test("records history and persists favorite plus feedback actions", async () => {
    const screen = await render(<RecipeScreen />);

    await screen.findByText("Erdbeer-Banane");
    await waitFor(() => expect(mockedHistory).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByText("☆ Als Favorit speichern"));
    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({
          favoriteRecipeKeys: ["stored:strawberry_banana"],
        }),
      ),
    );

    await fireEvent.press(screen.getByText("Gefällt mir"));
    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback: expect.objectContaining({
            "stored:strawberry_banana": "liked",
          }),
        }),
      ),
    );
  });
});
