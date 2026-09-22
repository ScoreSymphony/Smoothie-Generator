import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

function fail(message) {
  throw new Error(`Release audit failed: ${message}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

const SKIP_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  ".expo",
  "android",
  "ios",
  "coverage",
]);

function walk(directory) {
  const full = join(root, directory);
  if (!existsSync(full)) return [];
  return readdirSync(full).flatMap((name) => {
    if (SKIP_DIRECTORIES.has(name)) return [];
    const path = join(full, name);
    if (statSync(path).isDirectory()) return walk(relative(root, path));
    return [relative(root, path).replaceAll("\\", "/")];
  });
}

const activeFiles = walk(".");

const forbidden = activeFiles.filter((path) => {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".py") ||
    lower === ".dockerignore" ||
    lower.endsWith("/dockerfile") ||
    lower === "dockerfile" ||
    lower.includes("docker-compose") ||
    lower.endsWith("requirements.txt") ||
    lower.endsWith("pyproject.toml") ||
    lower.includes("streamlit")
  );
});
if (forbidden.length > 0) {
  fail(`legacy web/Python artifacts found: ${forbidden.join(", ")}`);
}

const app = readJson("app.json").expo;
const packageJson = readJson("package.json");
const platforms = [...(app.platforms ?? [])].sort();

if (JSON.stringify(platforms) !== JSON.stringify(["android", "ios"])) {
  fail(`Expo platforms must be exactly android + ios, got: ${platforms.join(", ")}`);
}
if (app.ios?.supportsTablet !== false) {
  fail("iOS tablet support must remain disabled for the phone-only product");
}
if (!app.android?.package || !app.ios?.bundleIdentifier) {
  fail("Android package and iOS bundle identifier must be configured");
}
if (app.version !== packageJson.version) {
  fail(`Expo version ${app.version} must match package version ${packageJson.version}`);
}
if (!Number.isInteger(app.android?.versionCode) || app.android.versionCode < 1) {
  fail("Android versionCode must be a positive integer");
}

const iconPath = app.android?.icon ?? app.icon;
if (!iconPath) {
  fail("an application icon must be configured");
}
if (!existsSync(join(root, iconPath))) {
  fail(`configured application icon does not exist: ${iconPath}`);
}

const buildScriptPath = "scripts/build-private-android.mjs";
const buildScript = readFileSync(join(root, buildScriptPath), "utf8");
if (!/run\(gradle, \["assembleRelease"\]/.test(buildScript)) {
  fail("Android private build must execute assembleRelease");
}
if (/run\(gradle, \["assembleDebug"\]/.test(buildScript)) {
  fail("Android release build must not execute assembleDebug");
}
if (/outputs[\\/]",?\s*"apk",?\s*"debug"|app-debug\.apk/.test(buildScript)) {
  fail("Android release build must not depend on a debug APK output");
}
if (!buildScript.includes("app-release.apk")) {
  fail("Android release build must assert app-release.apk output");
}

const requiredRoutes = [
  "src/app/index.tsx",
  "src/app/pantry.tsx",
  "src/app/suggestions.tsx",
  "src/app/recipe.tsx",
  "src/app/favorites.tsx",
  "src/app/history.tsx",
  "src/app/settings.tsx",
];
for (const path of requiredRoutes) {
  if (!existsSync(join(root, path))) fail(`required mobile route missing: ${path}`);
}

const sourceFiles = activeFiles.filter(
  (path) => path.startsWith("src/") && /\.(ts|tsx)$/.test(path),
);
const networkCalls = [];
for (const path of sourceFiles) {
  const content = readFileSync(join(root, path), "utf8");
  if (/\bfetch\s*\(|\baxios\b|XMLHttpRequest|WebSocket\s*\(/.test(content)) {
    networkCalls.push(path);
  }
}
if (networkCalls.length > 0) {
  fail(`core source contains network-client calls: ${networkCalls.join(", ")}`);
}

const ingredients = readJson("data/ingredients.json");
const recipes = readJson("data/recipes.json");
const nutrition = readJson("data/nutrition.json").ingredients;
if (!Array.isArray(ingredients) || ingredients.length < 119) {
  fail("ingredient corpus is incomplete");
}
if (!Array.isArray(recipes) || recipes.length < 80) {
  fail("recipe corpus is incomplete");
}
if (!nutrition || Object.keys(nutrition).length !== ingredients.length) {
  fail("nutrition coverage must match the ingredient corpus");
}

const requiredStorage = [
  "src/storage/database.ts",
  "src/storage/pantryStorage.ts",
  "src/storage/preferencesStorage.ts",
  "src/storage/historyStorage.ts",
];
for (const path of requiredStorage) {
  if (!existsSync(join(root, path))) fail(`required local persistence module missing: ${path}`);
}

const dependencyNames = Object.keys({
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
});
if (dependencyNames.some((name) => /server|express|next|vite/i.test(name))) {
  fail("web/server dependency detected in the active mobile package");
}

console.log("Mobile release audit PASS");
console.log(`- App version: ${app.version}`);
console.log(`- Android versionCode: ${app.android.versionCode}`);
console.log(`- App icon: ${iconPath}`);
console.log("- Android APK variant: release");
console.log(`- Expo platforms: ${platforms.join(", ")}`);
console.log(`- Ingredient corpus: ${ingredients.length}`);
console.log(`- Recipe corpus: ${recipes.length}`);
console.log(`- Nutrition entries: ${Object.keys(nutrition).length}`);
console.log(`- Native routes: ${requiredRoutes.length}`);
console.log("- Network-client calls in src/: 0");
console.log("- Legacy Python/Streamlit/Docker release artifacts: 0");
