import {
  DEFAULT_PANTRY_STATE,
  type PantryState,
  sanitizePantryState,
} from "@/domain/pantry";
import { getDatabase, initializeDatabase } from "@/storage/database";

const PANTRY_STATE_KEY = "pantry_state_v1";

interface AppMetaRow {
  value: string;
}

export async function loadPantryState(): Promise<PantryState> {
  await initializeDatabase();
  const database = await getDatabase();
  const row = await database.getFirstAsync<AppMetaRow>(
    "SELECT value FROM app_meta WHERE key = ?",
    PANTRY_STATE_KEY,
  );

  if (!row) {
    return DEFAULT_PANTRY_STATE;
  }

  try {
    return sanitizePantryState(JSON.parse(row.value));
  } catch {
    return DEFAULT_PANTRY_STATE;
  }
}

export async function savePantryState(state: PantryState): Promise<void> {
  await initializeDatabase();
  const database = await getDatabase();
  const sanitized = sanitizePantryState(state);

  await database.runAsync(
    `INSERT INTO app_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    PANTRY_STATE_KEY,
    JSON.stringify(sanitized),
  );
}

export async function resetPantryState(): Promise<void> {
  await initializeDatabase();
  const database = await getDatabase();
  await database.runAsync(
    "DELETE FROM app_meta WHERE key = ?",
    PANTRY_STATE_KEY,
  );
}
