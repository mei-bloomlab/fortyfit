import { createServer } from "node:http";
import {
  READY_DETAIL,
  SCAN_HINT,
  WAITING_DETAIL,
  createOpenWaHandler,
} from "./openwa-http.mjs";
import {
  MISSING_BAILEYS_COPY,
  SESSION_DIR,
  baileysQrToDataUrl,
  createBaileysSender,
  detailFromLaunchError,
  resolveBaileysExports,
  shouldReconnectBaileys,
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
  ready: false,
  detail: WAITING_DETAIL,
  qrDataUrl: null,
};

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

const server = createServer(
  createOpenWaHandler({
    getState: () => state,
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
  const { state: auth, saveCreds } = await baileys.useMultiFileAuthState(
    SESSION_DIR,
  );
  const sock = baileys.makeWASocket({
    auth,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
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
          state.detail = detailFromLaunchError(new Error("logged out"));
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
