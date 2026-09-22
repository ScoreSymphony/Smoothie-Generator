import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerBackTitle: "Zurück",
          headerTitleAlign: "center",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Smoothie Generator" }} />
        <Stack.Screen name="pantry" options={{ title: "Meine Zutaten" }} />
        <Stack.Screen name="suggestions" options={{ title: "Empfehlungen" }} />
        <Stack.Screen name="recipe" options={{ title: "Rezept" }} />
        <Stack.Screen name="favorites" options={{ title: "Favoriten" }} />
        <Stack.Screen name="history" options={{ title: "Verlauf" }} />
        <Stack.Screen name="settings" options={{ title: "Vorlieben" }} />
      </Stack>
    </>
  );
}
