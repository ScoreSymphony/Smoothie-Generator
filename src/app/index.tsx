import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIntro } from "@/components/AppIntro";
import { colors, spacing, typography } from "@/theme/tokens";

const ACTIONS = [
  { href: "/pantry", title: "Meine Zutaten", body: "Vorrat auswählen und Portionen festlegen." },
  { href: "/suggestions", title: "Smoothies finden", body: "Passende Rezepte und neue Kombinationen anzeigen." },
  { href: "/favorites", title: "Favoriten", body: "Gespeicherte Lieblingsrezepte wiederfinden." },
  { href: "/history", title: "Verlauf", body: "Zuletzt angesehene Smoothies öffnen." },
  { href: "/settings", title: "Vorlieben", body: "Ernährung, Allergien und Geschmacksziele einstellen." },
] as const;

export default function HomeScreen() {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppIntro />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Was möchtest du machen?</Text>
          {ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} asChild>
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionBody}>{action.body}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontWeight: "800" },
  action: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 74,
    padding: spacing.md,
  },
  actionText: { flex: 1, gap: 4 },
  actionTitle: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  actionBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  chevron: { color: colors.accent, fontSize: 28, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
