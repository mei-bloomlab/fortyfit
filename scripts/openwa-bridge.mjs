import { createServer } from "node:http";
import {
  READY_DETAIL,
  SCAN_HINT,
  WAITING_DETAIL,
  createOpenWaHandler,
} from "./openwa-http.mjs";
import {
  MISSING_BAILEYS_COPY,
  RESET_DETAIL,
  SESSION_DIR,
  baileysQrToDataUrl,
  createBaileysSender,
  detailFromLaunchError,
  resolveBaileysExports,
  shouldReconnectBaileys,
  unlinkBaileysSocket,
  wipeBaileysSession,
} from "./openwa-launch.mjs";

const port = Number(process.env.OPENWA_PORT ?? 43201);
const token = process.env.OPENWA_TOKEN ?? "";

async function loadSidecarPackages() {
  try {
    const baileysMod = await import("@whiskeysockets/baileys");
    const qrcodeMod = await import("qrcode");
    const baileys = resolveBaileysExports(baileysMod);
    const toDataUrl = qrcodeMod.default?.toDataURL ?? qrcodeMod.toDataURL;
    if (typeof baileys.makeWASocket !== "function") {
      throw new Error("Cannot find module '@whiskeysockets/baileys'");
    }
    if (typeof baileys.useMultiFileAuthState !== "function") {
      throw new Error("Cannot find module '@whiskeysockets/baileys'");
    }
    if (typeof toDataUrl !== "function") {
      throw new Error("Cannot find module 'qrcode'");
    }
    return { baileys, toDataUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (/cannot find module|not found/i.test(message)) {
      console.error(MISSING_BAILEYS_COPY);
    } else {
      console.error(detailFromLaunchError(error));
    }
    process.exit(1);
  }
}

const { baileys, toDataUrl } = await loadSidecarPackages();

const state = {
  client: null,
  sock: null,
  ready: false,
  detail: WAITING_DETAIL,
  qrDataUrl: null,
};

// Bumped on every socket start and on reset, so a retiring socket cannot
// overwrite the state of the socket that replaced it.
let generation = 0;

function captureQr(dataUrl) {
  if (!dataUrl) return;
  state.qrDataUrl = dataUrl;
  state.ready = false;
  state.detail = `QR siap. ${SCAN_HINT}`;
  console.log(
    `QR siap. Buka http://127.0.0.1:${port}/ atau /admin/setting — jangan cari di terminal.`,
  );
}

function markReady(client) {
  state.client = client ?? state.client;
  state.ready = true;
  state.qrDataUrl = null;
  state.detail = READY_DETAIL;
  console.log(state.detail);
}

function markDisconnected(reason) {
  state.ready = false;
  state.client = null;
  state.detail = `Sesi terputus${reason ? ` (${reason})` : ""}. Scan ulang dari /admin/setting.`;
  console.log(state.detail);
}

const AUTO_RESET_COOLDOWN_MS = 60_000;
let lastAutoResetAt = 0;

function canAutoReset() {
  const now = Date.now();
  if (now - lastAutoResetAt < AUTO_RESET_COOLDOWN_MS) return false;
  lastAutoResetAt = now;
  return true;
}

async function resetSession() {
  generation += 1;
  const retiring = state.sock;
  state.sock = null;
  state.client = null;
  state.ready = false;
  state.qrDataUrl = null;
  state.detail = RESET_DETAIL;
  console.log("Melepas tautan WhatsApp dan menghapus sesi lokal.");

  await unlinkBaileysSocket(retiring);
  await wipeBaileysSession(SESSION_DIR);
  await startSocket();
  return state.detail;
}

const server = createServer(
  createOpenWaHandler({
    getState: () => state,
    resetSession,
    token,
    port,
  }),
);

server.listen(port, "127.0.0.1", () => {
  console.log(`OpenWA bridge http://127.0.0.1:${port}`);
  console.log(
    "QR: buka /admin/setting di browser pada Mac ini, atau http://127.0.0.1:" +
      port +
      "/",
  );
  console.log(`Baileys session ${SESSION_DIR} (tanpa Chrome)`);
});

async function startSocket() {
  const id = (generation += 1);
  const { state: auth, saveCreds } = await baileys.useMultiFileAuthState(
    SESSION_DIR,
  );
  const sock = baileys.makeWASocket({
    auth,
    printQRInTerminal: false,
    syncFullHistory: false,
  });
  state.sock = sock;

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    if (id !== generation) return;
    try {
      if (update.qr) {
        captureQr(await baileysQrToDataUrl(update.qr, toDataUrl));
      }
      if (update.connection === "open") {
        markReady(createBaileysSender(sock));
        return;
      }
      if (update.connection === "close") {
        const loggedOut = !shouldReconnectBaileys(
          update.lastDisconnect,
          baileys.DisconnectReason,
        );
        markDisconnected(loggedOut ? "logged out" : "dropped");
        if (loggedOut) {
          // Revoked creds can never connect again. Wipe them so a fresh QR
          // shows up instead of leaving the panel dead until someone reads this.
          if (canAutoReset()) {
            await resetSession();
          } else {
            state.detail = detailFromLaunchError(new Error("logged out"));
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await startSocket();
      }
    } catch (error) {
      state.ready = false;
      state.qrDataUrl = null;
      state.detail = detailFromLaunchError(error);
      console.error(state.detail);
    }
  });
}

startSocket().catch((error) => {
  state.ready = false;
  state.qrDataUrl = null;
  state.detail = detailFromLaunchError(error);
  console.error(state.detail);
});
