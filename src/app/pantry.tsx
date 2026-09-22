import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadBundledIngredientCatalog,
} from "@/data/ingredientCatalog";
import { INGREDIENT_CATEGORIES, type Ingredient } from "@/domain/ingredients";
import {
  DEFAULT_PANTRY_STATE,
  MAX_SERVINGS,
  MIN_SERVINGS,
  addSelectedIngredients,
  filterPantryIngredients,
  parsePantryFreeText,
  setPantryServings,
  toggleAlwaysAvailableIngredient,
  toggleSelectedIngredient,
  type PantryCategoryFilter,
  type PantryState,
} from "@/domain/pantry";
import { loadPantryState, savePantryState } from "@/storage/pantryStorage";
import { colors, spacing, typography } from "@/theme/tokens";

const catalog = loadBundledIngredientCatalog();
const allIngredients = catalog.all();

const CATEGORY_LABELS: Record<PantryCategoryFilter, string> = {
  all: "Alle",
  fruit: "Obst",
  berries: "Beeren",
  liquid: "Flüssigkeit",
  creamy_base: "Cremig",
  greens: "Grün",
  protein: "Protein",
  sweetener: "Süße",
  nuts: "Nüsse",
  seeds: "Samen",
  spices: "Gewürze",
  boosters: "Extras",
  ice: "Eis",
};

const CATEGORY_FILTERS: readonly PantryCategoryFilter[] = [
  "all",
  ...INGREDIENT_CATEGORIES,
];

const ALWAYS_AVAILABLE_OPTIONS = ["water", "ice"] as const;

export default function PantryScreen() {
  const router = useRouter();
  const [pantry, setPantry] = useState<PantryState>(DEFAULT_PANTRY_STATE);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PantryCategoryFilter>("all");
  const [freeText, setFreeText] = useState("");
  const [unknownTerms, setUnknownTerms] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadPantryState()
      .then((stored) => {
        if (mounted) {
          setPantry(stored);
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError(
            "Der gespeicherte Vorrat konnte nicht geladen werden. Du kannst trotzdem weiter auswählen.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const commitPantry = useCallback(
    (updater: (current: PantryState) => PantryState) => {
      setPantry((current) => {
        const next = updater(current);
        if (next !== current) {
          void savePantryState(next).catch(() => {
            setStorageError(
              "Die Auswahl konnte gerade nicht lokal gespeichert werden.",
            );
          });
        }
        return next;
      });
    },
    [],
  );

  const filteredIngredients = useMemo(
    () => filterPantryIngredients(allIngredients, query, category),
    [category, query],
  );

  const selectedIngredients = useMemo(
    () =>
      pantry.selectedIds
        .map((id) => catalog.resolve(id))
        .filter((ingredient): ingredient is Ingredient => Boolean(ingredient)),
    [pantry.selectedIds],
  );

  const handleFreeText = useCallback(() => {
    const parsed = parsePantryFreeText(freeText);
    setUnknownTerms(parsed.unknownTerms);

    if (parsed.resolvedIds.length > 0) {
      commitPantry((current) =>
        addSelectedIngredients(current, parsed.resolvedIds),
      );
    }

    setFreeText("");
  }, [commitPantry, freeText]);

  const renderIngredient = useCallback(
    ({ item }: { item: Ingredient }) => {
      const selected = pantry.selectedIds.includes(item.id);
      const alwaysAvailable = pantry.alwaysAvailableIds.includes(item.id);
      const checked = selected || alwaysAvailable;

      return (
        <Pressable
          accessibilityLabel={
            alwaysAvailable
              ? `${item.nameDe} ist immer verfügbar`
              : `${item.nameDe} ${selected ? "abwählen" : "auswählen"}`
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled: alwaysAvailable }}
          disabled={alwaysAvailable}
          onPress={() =>
            commitPantry((current) =>
              toggleSelectedIngredient(current, item.id),
            )
          }
          style={({ pressed }) => [
            styles.ingredientRow,
            checked && styles.ingredientRowSelected,
            alwaysAvailable && styles.ingredientRowAlways,
            pressed && !alwaysAvailable && styles.pressed,
          ]}
        >
          <View style={styles.ingredientText}>
            <Text style={styles.ingredientName}>{item.nameDe}</Text>
            <Text style={styles.ingredientMeta}>
              {CATEGORY_LABELS[item.category]}
              {item.subcategory ? ` · ${item.subcategory}` : ""}
            </Text>
          </View>
          <View
            style={[
              styles.checkmark,
              checked && styles.checkmarkSelected,
            ]}
          >
            <Text
              style={[
                styles.checkmarkText,
                checked && styles.checkmarkTextSelected,
              ]}
            >
              {alwaysAvailable ? "∞" : checked ? "✓" : "+"}
            </Text>
          </View>
        </Pressable>
      );
    },
    [commitPantry, pantry.alwaysAvailableIds, pantry.selectedIds],
  );

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.intro}>
        <Text style={styles.title}>Was hast du da?</Text>
        <Text style={styles.body}>
          Wähle Zutaten aus deinem Vorrat. Die Auswahl bleibt lokal auf deinem
          Handy gespeichert.
        </Text>
      </View>

      {storageError ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          {storageError}
        </Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portionen</Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel="Portionen verringern"
            accessibilityRole="button"
            disabled={pantry.servings <= MIN_SERVINGS}
            onPress={() =>
              commitPantry((current) =>
                setPantryServings(current, current.servings - 1),
              )
            }
            style={({ pressed }) => [
              styles.stepperButton,
              pantry.servings <= MIN_SERVINGS && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Text accessibilityLabel={`${pantry.servings} Portionen`} style={styles.servings}>
            {pantry.servings}
          </Text>
          <Pressable
            accessibilityLabel="Portionen erhöhen"
            accessibilityRole="button"
            disabled={pantry.servings >= MAX_SERVINGS}
            onPress={() =>
              commitPantry((current) =>
                setPantryServings(current, current.servings + 1),
              )
            }
            style={({ pressed }) => [
              styles.stepperButton,
              pantry.servings >= MAX_SERVINGS && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Immer verfügbar</Text>
        <Text style={styles.helper}>
          Basics werden automatisch zu jedem Vorrat hinzugefügt.
        </Text>
        <View style={styles.inlineButtons}>
          {ALWAYS_AVAILABLE_OPTIONS.map((id) => {
            const ingredient = catalog.require(id);
            const active = pantry.alwaysAvailableIds.includes(id);
            return (
              <Pressable
                key={id}
                accessibilityLabel={`${ingredient.nameDe} ${active ? "nicht mehr immer verfügbar" : "immer verfügbar machen"}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() =>
                  commitPantry((current) =>
                    toggleAlwaysAvailableIngredient(current, id),
                  )
                }
                style={({ pressed }) => [
                  styles.basicButton,
                  active && styles.basicButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.basicButtonText,
                    active && styles.basicButtonTextActive,
                  ]}
                >
                  {active ? "✓ " : ""}
                  {ingredient.nameDe}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Ausgewählt · {pantry.selectedIds.length}
        </Text>
        {selectedIngredients.length === 0 ? (
          <Text style={styles.helper}>
            Noch keine zusätzlichen Zutaten ausgewählt.
          </Text>
        ) : (
          <View style={styles.selectedWrap}>
            {selectedIngredients.map((ingredient) => (
              <Pressable
                key={ingredient.id}
                accessibilityLabel={`${ingredient.nameDe} entfernen`}
                accessibilityRole="button"
                onPress={() =>
                  commitPantry((current) =>
                    toggleSelectedIngredient(current, ingredient.id),
                  )
                }
                style={({ pressed }) => [
                  styles.selectedChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.selectedChipText}>
                  {ingredient.nameDe} ×
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weiter</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
          style={({ pressed }) => [
            styles.secondaryNavButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryNavText}>Vorlieben einstellen</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/suggestions")}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Empfehlungen anzeigen</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schnell eingeben</Text>
        <Text style={styles.helper}>
          Mehrere Zutaten mit Komma, Semikolon oder Zeilenumbruch trennen.
          Deutsche Namen und bekannte Aliase funktionieren ebenfalls.
        </Text>
        <TextInput
          accessibilityLabel="Zutaten als Freitext"
          multiline
          onChangeText={setFreeText}
          placeholder="z. B. Banane, Heidelbeere, Hafermilch"
          placeholderTextColor={colors.textMuted}
          style={styles.freeTextInput}
          value={freeText}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!freeText.trim()}
          onPress={handleFreeText}
          style={({ pressed }) => [
            styles.primaryButton,
            !freeText.trim() && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Freitext hinzufügen</Text>
        </Pressable>
        {unknownTerms.length > 0 ? (
          <Text accessibilityRole="alert" style={styles.unknownText}>
            Nicht erkannt: {unknownTerms.join(", ")}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zutaten durchsuchen</Text>
        <TextInput
          accessibilityLabel="Zutaten suchen"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Name oder Alias suchen"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        <ScrollView
          contentContainerStyle={styles.categoryContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {CATEGORY_FILTERS.map((filter) => {
            const active = filter === category;
            return (
              <Pressable
                key={filter}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(filter)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {CATEGORY_LABELS[filter]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.resultCount}>
          {filteredIngredients.length} Zutaten
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.helper}>Vorrat wird geladen …</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <FlatList
        ListEmptyComponent={
          <Text style={styles.empty}>
            Keine passende Zutat gefunden. Du kannst sie oben als Freitext
            eingeben.
          </Text>
        }
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        data={filteredIngredients}
        initialNumToRender={18}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        renderItem={renderIngredient}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
  },
  intro: {
    gap: spacing.sm,
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "700",
  },
  helper: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  warning: {
    backgroundColor: "#FFF2CC",
    borderRadius: 12,
    color: colors.text,
    padding: spacing.md,
  },
  stepper: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 56,
  },
  stepperButtonText: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  servings: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    minWidth: 36,
    textAlign: "center",
  },
  inlineButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  basicButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  basicButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  basicButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
  basicButtonTextActive: {
    color: colors.onAccent,
  },
  selectedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectedChip: {
    backgroundColor: "#E8F3EC",
    borderRadius: 999,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedChipText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  freeTextInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 84,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: typography.body,
    fontWeight: "700",
  },
  secondaryNavButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  secondaryNavText: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: "700",
  },
  unknownText: {
    color: "#8A4B00",
    fontSize: 14,
    lineHeight: 20,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  categoryContent: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: colors.onAccent,
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  ingredientRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ingredientRowSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  ingredientRowAlways: {
    backgroundColor: "#EFF5F1",
  },
  ingredientText: {
    flex: 1,
    gap: 3,
  },
  ingredientName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
  },
  ingredientMeta: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  checkmark: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  checkmarkSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmarkText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: "800",
  },
  checkmarkTextSelected: {
    color: colors.onAccent,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.body,
    paddingVertical: spacing.xl,
    textAlign: "center",
  },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.lg,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
