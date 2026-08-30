import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadDotEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = cleaned.indexOf("=");
    if (eq === -1) continue;
    const key = cleaned.slice(0, eq).trim();
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const children = [];

function start(label, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`[openwa] ${label} keluar dengan kode ${code}`);
    }
  });
  return child;
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("OpenWA sidecar FortyFit");
console.log("1) Chrome akan terbuka di Mac ini — scan QR di jendela itu, atau di /admin/setting.");
console.log("2) Biarkan terminal ini terbuka selama laptop nyala (~09–17 WITA).");
console.log("3) Kalau TimeoutError: hapus folder _IGNORE_fortyfit, lalu npm run openwa lagi.");
console.log("4) Admin mengubah ambang, jam, dan nomor penerima di /admin/setting — bukan di sini.");

start("bridge", process.execPath, [resolve(process.cwd(), "scripts/openwa-bridge.mjs")]);

if (!process.env.DATABASE_URL) {
  console.warn(
    "[openwa-drain] DATABASE_URL belum diisi. QR tetap bisa di-scan, tapi antrian Neon tidak dikirim.",
  );
} else {
  let tsx;
  try {
    tsx = require.resolve("tsx/cli");
  } catch {
    console.error(
      "[openwa-drain] Paket tsx belum ada. Jalankan npm install di folder repo, lalu npm run openwa lagi.",
    );
    process.exitCode = 0;
  }
  if (tsx) {
    start("drain", process.execPath, [tsx, resolve(process.cwd(), "scripts/openwa-drain.ts")]);
  }
}
