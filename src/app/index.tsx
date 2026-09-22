import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIntro } from "@/components/AppIntro";
import { colors, spacing, typography } from "@/theme/tokens";

export default function HomeScreen() {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <AppIntro />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loslegen</Text>
          <Text style={styles.sectionBody}>
            Im nächsten Schritt wird die vorhandene Zutaten-Datenbank in die
            mobile TypeScript-Domäne übernommen.
          </Text>
        </View>

        <Link href="/pantry" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zutaten auswählen"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Zutaten auswählen</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.xl,
    padding: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "700",
  },
  sectionBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 18,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
