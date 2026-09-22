import { getDatabase, initializeDatabase } from "@/storage/database";
import type { RecommendationSource, RecommendationView } from "@/domain/recommendations";

const HISTORY_KEY = "recipe_history_v1";
const MAX_HISTORY_ENTRIES = 50;

export interface HistoryEntry {
  readonly recipeKey: string;
  readonly title: string;
  readonly source: RecommendationSource;
  readonly ingredientIds: readonly string[];
  readonly viewedAt: string;
}

interface AppMetaRow { value: string }

function sanitizeHistoryEntry(value: unknown): HistoryEntry | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (
    typeof record.recipeKey !== "string" ||
    !record.recipeKey.trim() ||
    typeof record.title !== "string" ||
    !record.title.trim() ||
    (record.source !== "stored" && record.source !== "generated") ||
    !Array.isArray(record.ingredientIds) ||
    typeof record.viewedAt !== "string" ||
    Number.isNaN(Date.parse(record.viewedAt))
  ) return undefined;

  const ingredientIds = record.ingredientIds.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
  if (ingredientIds.length === 0) return undefined;

  return Object.freeze({
    recipeKey: record.recipeKey,
    title: record.title,
    source: record.source,
    ingredientIds: Object.freeze(ingredientIds),
    viewedAt: record.viewedAt,
  });
}

export async function loadRecipeHistory(): Promise<readonly HistoryEntry[]> {
  await initializeDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync<AppMetaRow>(
    "SELECT value FROM app_meta WHERE key = ?",
    HISTORY_KEY,
  );
  if (!row) return Object.freeze([]);

  try {
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed)) return Object.freeze([]);
    return Object.freeze(
      parsed.map(sanitizeHistoryEntry).filter((item): item is HistoryEntry => Boolean(item)),
    );
  } catch {
    return Object.freeze([]);
  }
}

async function saveRecipeHistory(entries: readonly HistoryEntry[]): Promise<void> {
  await initializeDatabase();
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    HISTORY_KEY,
    JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)),
  );
}

export async function addRecommendationToHistory(
  recommendation: RecommendationView,
  viewedAt = new Date().toISOString(),
): Promise<HistoryEntry> {
  const entry: HistoryEntry = Object.freeze({
    recipeKey: recommendation.key,
    title: recommendation.title,
    source: recommendation.source,
    ingredientIds: recommendation.ingredientIds,
    viewedAt,
  });
  const existing = await loadRecipeHistory();
  const next = [
    entry,
    ...existing.filter((item) => item.recipeKey !== entry.recipeKey),
  ].slice(0, MAX_HISTORY_ENTRIES);
  await saveRecipeHistory(next);
  return entry;
}

export async function clearRecipeHistory(): Promise<void> {
  await initializeDatabase();
  const db = await getDatabase();
  await db.runAsync("DELETE FROM app_meta WHERE key = ?", HISTORY_KEY);
}
