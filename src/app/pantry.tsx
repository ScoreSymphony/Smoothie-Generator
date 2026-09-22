import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/theme/tokens";

export default function PantryScreen() {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Meine Zutaten</Text>
        <Text style={styles.body}>
          Dieser native Screen ist die Grundlage für M2. Suche, Kategorien,
          Auswahl und lokale Persistenz werden hier schrittweise integriert.
        </Text>
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
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: "800",
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
  },
});
