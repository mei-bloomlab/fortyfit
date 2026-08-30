export const SESSION_ID = "fortyfit";
export const SESSION_DIR = "_IGNORE_fortyfit";

export const OPENWA_CREATE_CONFIG = {
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

export function detailFromLaunchError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/timeout|30000ms|waiting failed/i.test(message)) {
    return `Timeout sebelum QR. Hapus folder ${SESSION_DIR} di repo, lalu npm run openwa lagi.`;
  }
  return message || "Gagal start OpenWA";
}
