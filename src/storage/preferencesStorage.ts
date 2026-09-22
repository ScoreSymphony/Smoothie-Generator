import {
  DEFAULT_USER_PREFERENCES,
  sanitizeUserPreferences,
  type UserPreferences,
} from "@/domain/preferences";
import { getDatabase, initializeDatabase } from "@/storage/database";

export const PREFERENCES_STORAGE_KEY = "user_preferences";
export const PREFERENCES_SCHEMA_VERSION = 1;

interface AppMetaRow {
  value: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function encodePreferencesState(
  preferences: UserPreferences,
): string {
  return JSON.stringify({
    version: PREFERENCES_SCHEMA_VERSION,
    data: preferences,
  });
}

export function decodePreferencesState(value: unknown): {
  readonly preferences: UserPreferences;
  readonly migrated: boolean;
} {
  if (!isRecord(value)) {
    return {
      preferences: DEFAULT_USER_PREFERENCES,
      migrated: false,
    };
  }

  if (value.version === PREFERENCES_SCHEMA_VERSION) {
    return {
      preferences: sanitizeUserPreferences(value.data),
      migrated: false,
    };
  }

  if (typeof value.version === "number" && value.version > PREFERENCES_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported preferences schema version: ${value.version}`,
    );
  }

  const legacyData =
    "data" in value && isRecord(value.data)
      ? value.data
      : value;

  return {
    preferences: sanitizeUserPreferences(legacyData),
    migrated: true,
  };
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  await initializeDatabase();
  const database = await getDatabase();
  const row = await database.getFirstAsync<AppMetaRow>(
    "SELECT value FROM app_meta WHERE key = ?",
    PREFERENCES_STORAGE_KEY,
  );

  if (!row) {
    return DEFAULT_USER_PREFERENCES;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }

  const decoded = decodePreferencesState(parsed);
  if (decoded.migrated) {
    await saveUserPreferences(decoded.preferences);
  }
  return decoded.preferences;
}

export async function saveUserPreferences(
  preferences: UserPreferences,
): Promise<void> {
  await initializeDatabase();
  const database = await getDatabase();
  const sanitized = sanitizeUserPreferences(preferences);

  await database.runAsync(
    `INSERT INTO app_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    PREFERENCES_STORAGE_KEY,
    encodePreferencesState(sanitized),
  );
}

export async function resetUserPreferences(): Promise<void> {
  await initializeDatabase();
  const database = await getDatabase();
  await database.runAsync(
    "DELETE FROM app_meta WHERE key = ?",
    PREFERENCES_STORAGE_KEY,
  );
}
