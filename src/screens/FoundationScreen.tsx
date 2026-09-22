import { ScrollView, StyleSheet, Text } from "react-native";
import { SectionCard } from "../components/SectionCard";
import { getBundledCatalogStats } from "../data/catalog";
import { colors, spacing, typography } from "../theme/tokens";

export function FoundationScreen() {
  const stats = getBundledCatalogStats();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <SectionCard title="Lokale Daten">
        <Text style={styles.body}>{stats.ingredients} Zutaten</Text>
        <Text style={styles.body}>{stats.recipes} gespeicherte Rezepte</Text>
        <Text style={styles.body}>{stats.nutritionEntries} Nährwertdatensätze</Text>
      </SectionCard>

      <SectionCard title="Produktgrenzen">
        <Text style={styles.body}>• Kein Streamlit</Text>
        <Text style={styles.body}>• Keine Website als Produkt</Text>
        <Text style={styles.body}>• Kein Pflicht-Backend</Text>
        <Text style={styles.body}>• Kernfunktionen offline auf dem Gerät</Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  body: { color: colors.text, fontSize: typography.body, lineHeight: 24 }
});
