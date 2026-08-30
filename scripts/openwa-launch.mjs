export const SESSION_ID = "fortyfit";
export const SESSION_DIR = "_IGNORE_fortyfit";

export const MAC_CHROME_EXECUTABLE =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Bind Puppeteer to a real Chrome binary. useChrome:true alone can still launch
 * a Chromium WhatsApp Web rejects ("Update Google Chrome").
 */
export function resolveChromeExecutablePath(
  env = process.env,
  platform = process.platform,
) {
  const fromEnv = String(env.CHROME_PATH ?? "").trim();
  if (fromEnv) return fromEnv;
  if (platform === "darwin") return MAC_CHROME_EXECUTABLE;
  return undefined;
}

export function buildOpenWaCreateConfig(
  env = process.env,
  platform = process.platform,
) {
  const config = {
    sessionId: SESSION_ID,
    multiDevice: true,
    useChrome: true,
    headless: false,
    authTimeout: 0,
    qrTimeout: 0,
    waitForRipeSessionTimeout: 0,
    waitForRipeSession: false,
    killProcessOnTimeout: false,
    blockCrashLogs: true,
    disableSpins: true,
    qrLogSkip: true,
    cachedPatch: true,
  };
  const executablePath = resolveChromeExecutablePath(env, platform);
  if (executablePath) {
    config.executablePath = executablePath;
  }
  return config;
}

export const OPENWA_CREATE_CONFIG = buildOpenWaCreateConfig();

export function detailFromLaunchError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/timeout|30000ms|waiting failed/i.test(message)) {
    return `Timeout sebelum QR. Hapus folder ${SESSION_DIR} di repo, lalu npm run openwa lagi.`;
  }
  return message || "Gagal start OpenWA";
}
