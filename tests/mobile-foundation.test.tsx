import { fireEvent, render } from "@testing-library/react-native";
import { HomeScreen } from "../src/screens/HomeScreen";
import { getBundledCatalogStats } from "../src/data/catalog";
import {
  readJson,
  removeStoredValue,
  writeJson
} from "../src/storage/keyValueStorage";

describe("mobile foundation", () => {
  it("bundles the curated local catalogs", () => {
    const stats = getBundledCatalogStats();

    expect(stats.ingredients).toBeGreaterThan(0);
    expect(stats.recipes).toBeGreaterThan(0);
    expect(stats.nutritionEntries).toBeGreaterThan(0);
  });

  it("renders the native home screen and navigates", () => {
    const navigate = jest.fn();
    const screen = render(
      <HomeScreen
        navigation={{ navigate } as never}
        route={{ key: "Home", name: "Home" } as never}
      />
    );

    fireEvent.press(screen.getByText("Mobile-Grundlage anzeigen"));

    expect(navigate).toHaveBeenCalledWith("Foundation");
  });

  it("persists JSON values on-device through the storage adapter", async () => {
    await writeJson("test", { enabled: true });
    await expect(readJson<{ enabled: boolean }>("test")).resolves.toEqual({
      enabled: true
    });

    await removeStoredValue("test");
    await expect(readJson("test")).resolves.toBeNull();
  });
});
