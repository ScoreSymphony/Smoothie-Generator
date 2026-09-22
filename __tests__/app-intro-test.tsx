import { render } from "@testing-library/react-native";

import { AppIntro } from "@/components/AppIntro";

describe("<AppIntro />", () => {
  test("describes the product as a mobile offline-first smoothie app", async () => {
    const screen = await render(<AppIntro />);

    screen.getByText("MOBILE · OFFLINE-FIRST");
    screen.getByText("Smoothies aus dem, was du da hast.");
    screen.getByText(/ohne Web-App und ohne Pflicht-Cloud/);
  });
});
