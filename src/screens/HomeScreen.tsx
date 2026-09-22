import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../components/SectionCard";
import type { RootStackParamList } from "../navigation/types";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MOBILE ONLY</Text>
        <Text style={styles.title}>Deine Zutaten. Deine Smoothies.</Text>
        <Text style={styles.subtitle}>
          Eine private, offline-first Handy-App für Android und iOS.
        </Text>
      </View>

      <SectionCard title="Aktueller Stand">
        <Text style={styles.body}>
          Die technische Basis läuft mit React Native, Expo und TypeScript. Die
          vorhandenen kuratierten Zutaten-, Rezept- und Nährwertdaten bleiben
          lokal im App-Bundle.
        </Text>
      </SectionCard>

      <SectionCard title="Als Nächstes">
        <Text style={styles.body}>
          M1 portiert das Ingredient-Domainmodell nach TypeScript. Danach folgt
          die touch-optimierte Vorratsauswahl.
        </Text>
      </SectionCard>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("Foundation")}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Mobile-Grundlage anzeigen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  hero: { gap: spacing.sm, paddingVertical: spacing.lg },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 1.5
  },
  title: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: "800",
    lineHeight: 42
  },
  subtitle: { color: colors.muted, fontSize: typography.body, lineHeight: 24 },
  body: { color: colors.text, fontSize: typography.body, lineHeight: 24 },
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.onAccent, fontSize: typography.body, fontWeight: "700" }
});
