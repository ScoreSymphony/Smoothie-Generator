import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PantryScreen from "@/app/pantry";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));
import { loadPantryState, savePantryState } from "@/storage/pantryStorage";

jest.mock("@/storage/pantryStorage", () => ({
  loadPantryState: jest.fn(),
  savePantryState: jest.fn(),
}));

const mockedLoad = loadPantryState as jest.MockedFunction<typeof loadPantryState>;
const mockedSave = savePantryState as jest.MockedFunction<typeof savePantryState>;

describe("<PantryScreen />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockReset();
    mockedLoad.mockResolvedValue({
      selectedIds: [],
      alwaysAvailableIds: ["water", "ice"],
      servings: 2,
    });
    mockedSave.mockResolvedValue(undefined);
  });

  test("restores pantry state and supports touch selection", async () => {
    const screen = await render(<PantryScreen />);

    const banana = await screen.findByLabelText("Banane auswählen");
    await fireEvent.press(banana);

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith({
        selectedIds: ["banana"],
        alwaysAvailableIds: ["water", "ice"],
        servings: 2,
      }),
    );

    screen.getByLabelText("Banane abwählen");
  });

  test("accepts alias-based free text and reports unknown terms", async () => {
    const screen = await render(<PantryScreen />);

    await screen.findByText("Was hast du da?");

    await fireEvent.changeText(
      screen.getByLabelText("Zutaten als Freitext"),
      "Heidelbeere, Hafermilch, Mystery",
    );
    await fireEvent.press(screen.getByText("Freitext hinzufügen"));

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith({
        selectedIds: ["blueberry", "oat_milk"],
        alwaysAvailableIds: ["water", "ice"],
        servings: 2,
      }),
    );

    screen.getByText("Nicht erkannt: Mystery");
  });

  test("continues from pantry to preferences and recommendations", async () => {
    const screen = await render(<PantryScreen />);

    await screen.findByText("Was hast du da?");
    await fireEvent.press(screen.getByText("Vorlieben einstellen"));
    expect(mockPush).toHaveBeenCalledWith("/settings");

    await fireEvent.press(screen.getByText("Empfehlungen anzeigen"));
    expect(mockPush).toHaveBeenCalledWith("/suggestions");
  });

  test("searches aliases and switches category filters", async () => {
    const screen = await render(<PantryScreen />);

    await screen.findByText("Was hast du da?");
    await fireEvent.changeText(screen.getByLabelText("Zutaten suchen"), "Heidel");

    await waitFor(() => screen.getByText("Blaubeere"));
    expect(screen.queryByText("Banane")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Zutaten suchen"), "");
    await fireEvent.press(screen.getByText("Flüssigkeit"));

    await waitFor(() => screen.getByText("Haferdrink"));
  });
});
