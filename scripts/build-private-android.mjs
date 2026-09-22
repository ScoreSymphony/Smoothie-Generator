import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const isWindows = process.platform === "win32";
const npx = isWindows ? "npx.cmd" : "npx";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: {
      ...process.env,
      CI: process.env.CI ?? "1",
      EXPO_NO_TELEMETRY: process.env.EXPO_NO_TELEMETRY ?? "1",
    },
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(npx, ["expo", "prebuild", "--platform", "android", "--clean"]);

const androidDir = join(root, "android");
const gradle = isWindows ? "gradlew.bat" : "./gradlew";

// A release variant embeds the React Native JavaScript bundle in the APK.
// Do not replace this with assembleDebug: debug builds expect Metro at runtime.
run(gradle, ["assembleRelease"], { cwd: androidDir });

const apk = join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);

if (!existsSync(apk)) {
  throw new Error(`Expected standalone release APK not found: ${apk}`);
}

console.log(`Standalone Android release APK created: ${apk}`);
