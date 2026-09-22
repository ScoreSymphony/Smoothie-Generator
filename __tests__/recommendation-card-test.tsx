import { fireEvent, render } from "@testing-library/react-native";

import { RecommendationCard } from "@/components/RecommendationCard";
import type { RecommendationView } from "@/domain/recommendations";

const recommendation: RecommendationView = {
  key: "stored:strawberry_banana",
  source: "stored",
  title: "Erdbeer-Banane",
  ingredientIds: ["banana", "strawberry", "oat_milk"],
  ingredients: [],
  nutrition: {
    calories: 210,
    proteinG: 5.2,
    carbohydratesG: 40,
    sugarG: 25,
    fatG: 3,
    fiberG: 6,
  },
  availabilityLabel: "Alles vorhanden",
  missingIngredientIds: [],
  substitutionLabels: [],
  tags: ["fruchtig"],
  instructions: ["Mixen"],
};

describe("<RecommendationCard />", () => {
  test("shows user-facing recipe data and supports open/favorite actions", async () => {
    const onOpen = jest.fn();
    const onFavorite = jest.fn();
    const screen = await render(
      <RecommendationCard
        recommendation={recommendation}
        onOpen={onOpen}
        onToggleFavorite={onFavorite}
      />,
    );

    screen.getByText("Erdbeer-Banane");
    screen.getByText("Alles vorhanden");
    screen.getByText(/210 kcal/);

    await fireEvent.press(
      screen.getByLabelText("Erdbeer-Banane zu Favoriten hinzufügen"),
    );
    expect(onFavorite).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText("Erdbeer-Banane öffnen"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
