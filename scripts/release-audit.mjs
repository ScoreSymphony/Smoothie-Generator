import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { inflateSync } from "node:zlib";

const root = process.cwd();

function fail(message) {
  throw new Error(`Release audit failed: ${message}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function validatePng(path) {
  const data = readFileSync(join(root, path));
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (data.length < 33 || !data.subarray(0, 8).equals(signature)) {
    fail(`application icon is not a valid PNG: ${path}`);
  }

  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let compression;
  let filterMethod;
  let interlace;
  const idat = [];

  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;

    if (end + 4 > data.length) {
      fail(`application icon contains a truncated PNG chunk: ${path}`);
    }

    if (type === "IHDR") {
      width = data.readUInt32BE(start);
      height = data.readUInt32BE(start + 4);
      bitDepth = data[start + 8];
      colorType = data[start + 9];
      compression = data[start + 10];
      filterMethod = data[start + 11];
      interlace = data[start + 12];
    } else if (type === "IDAT") {
      idat.push(data.subarray(start, end));
    } else if (type === "IEND") {
      break;
    }

    offset = end + 4;
  }

  if (!width || !height || width !== height || width < 256) {
    fail(`application icon must be a square PNG of at least 256x256 pixels: ${path}`);
  }
  if (
    bitDepth !== 8 ||
    colorType !== 6 ||
    compression !== 0 ||
    filterMethod !== 0 ||
    interlace !== 0
  ) {
    fail(
      `application icon must use non-interlaced 8-bit RGBA PNG encoding compatible with Expo/Jimp: ${path}`,
    );
  }
  if (idat.length === 0) {
    fail(`application icon PNG contains no image data: ${path}`);
  }

  let raw;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    fail(`application icon PNG image data cannot be inflated: ${path}`);
  }

  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;
  const expectedLength = height * (rowLength + 1);
  if (raw.length !== expectedLength) {
    fail(`application icon PNG has unexpected scanline data: ${path}`);
  }

  for (let row = 0; row < height; row += 1) {
    const filterType = raw[row * (rowLength + 1)];
    if (filterType > 4) {
      fail(
        `application icon PNG uses unsupported scanline filter ${filterType} on row ${row}: ${path}`,
      );
    }
  }

  return { width, height };
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
const iconInfo = validatePng(iconPath);

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
console.log(`- App icon: ${iconPath} (${iconInfo.width}x${iconInfo.height} RGBA PNG)`);
console.log("- Android APK variant: release");
console.log(`- Expo platforms: ${platforms.join(", ")}`);
console.log(`- Ingredient corpus: ${ingredients.length}`);
console.log(`- Recipe corpus: ${recipes.length}`);
console.log(`- Nutrition entries: ${Object.keys(nutrition).length}`);
console.log(`- Native routes: ${requiredRoutes.length}`);
console.log("- Network-client calls in src/: 0");
console.log("- Legacy Python/Streamlit/Docker release artifacts: 0");
