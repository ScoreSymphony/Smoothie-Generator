import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = PropsWithChildren<{ title: string }>;

export function SectionCard({ title, children }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  content: { gap: spacing.xs },
  title: { color: colors.text, fontSize: typography.heading, fontWeight: "700" }
});
