import { render } from "@testing-library/react-native";

import { RecipeMetricsPanel } from "@/components/RecipeMetricsPanel";

describe("<RecipeMetricsPanel />", () => {
  test("renders mobile-friendly quantities and approximate nutrition", async () => {
    const screen = await render(
      <RecipeMetricsPanel
        servings={2}
        ingredients={[
          {
            ingredientId: "banana",
            quantity: { amount: 2, unit: "piece" },
          },
          {
            ingredientId: "oat_milk",
            quantity: { amount: 400, unit: "ml" },
          },
        ]}
        nutrition={{
          calories: 420.4,
          proteinG: 12.2,
          carbohydratesG: 70.1,
          sugarG: 35,
          fatG: 8.5,
          fiberG: 10,
        }}
      />,
    );

    screen.getByText("Mengen für 2 Portionen");
    screen.getByText("Banane");
    screen.getByText("2 Stück");
    screen.getByText("400 ml");
    screen.getByText("Nährwerte gesamt (ca.)");
    screen.getByText("420,4 kcal");
    screen.getByText("12,2 g");
    screen.getByText("Ballaststoffe");
  });
});
