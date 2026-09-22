import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme/tokens";

export function AppIntro() {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>MOBILE · OFFLINE-FIRST</Text>
      <Text style={styles.title}>Smoothies aus dem, was du da hast.</Text>
      <Text style={styles.body}>
        Zutaten auswählen, passende Rezepte finden und neue Kombinationen
        direkt auf dem Handy generieren — ohne Web-App und ohne Pflicht-Cloud.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: "800",
    lineHeight: 38,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
  },
});
