import { fireEvent, render } from "@testing-library/react-native";

import SuggestionsScreen from "@/app/suggestions";
import { buildRecommendations } from "@/domain/recommendations";
import { DEFAULT_USER_PREFERENCES } from "@/domain/preferences";
import { loadPantryState } from "@/storage/pantryStorage";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "@/storage/preferencesStorage";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/storage/pantryStorage", () => ({
  loadPantryState: jest.fn(),
}));

jest.mock("@/storage/preferencesStorage", () => ({
  loadUserPreferences: jest.fn(),
  saveUserPreferences: jest.fn(),
}));

const mockedPantry = loadPantryState as jest.MockedFunction<typeof loadPantryState>;
const mockedPreferences =
  loadUserPreferences as jest.MockedFunction<typeof loadUserPreferences>;
const mockedSave = saveUserPreferences as jest.MockedFunction<typeof saveUserPreferences>;

const pantry = {
  selectedIds: ["banana", "strawberry", "oat_milk"],
  alwaysAvailableIds: ["water", "ice"],
  servings: 2,
} as const;

describe("<SuggestionsScreen />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockReset();
    mockedPantry.mockResolvedValue(pantry);
    mockedPreferences.mockResolvedValue(DEFAULT_USER_PREFERENCES);
    mockedSave.mockResolvedValue(undefined);
  });

  test("shows ranked recommendations and opens recipe details", async () => {
    const expected = buildRecommendations(
      pantry,
      DEFAULT_USER_PREFERENCES,
      17,
    )[0];
    const screen = await render(<SuggestionsScreen />);

    await screen.findByText("Deine Smoothies");
    const open = await screen.findByLabelText(`${expected.title} öffnen`);
    await fireEvent.press(open);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/recipe",
      params: { key: expected.key },
    });

    const alternate = buildRecommendations(
      pantry,
      DEFAULT_USER_PREFERENCES,
      17,
      1,
    )[0];
    const button = screen.getByLabelText(
      "Andere Smoothie-Kombinationen erzeugen",
    );
    fireEvent.press(button);

    await screen.findByLabelText(`${alternate.title} öffnen`);
  });
});
