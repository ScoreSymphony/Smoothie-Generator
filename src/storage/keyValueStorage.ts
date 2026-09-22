import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "smoothie-generator:";

function keyFor(key: string) {
  return `${PREFIX}${key}`;
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(keyFor(key), JSON.stringify(value));
}

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(keyFor(key));

  if (raw === null) {
    return null;
  }

  return JSON.parse(raw) as T;
}

export async function removeStoredValue(key: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(key));
}
