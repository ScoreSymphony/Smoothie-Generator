import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FoundationScreen } from "../screens/FoundationScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { colors } from "../theme/tokens";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Smoothie Generator" }}
      />
      <Stack.Screen
        name="Foundation"
        component={FoundationScreen}
        options={{ title: "Mobile-Grundlage" }}
      />
    </Stack.Navigator>
  );
}
