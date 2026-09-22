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
      </Stack>
    </>
  );
}
