import { createServer } from "node:http";
import { createRequire } from "node:module";
import {
  READY_DETAIL,
  SCAN_HINT,
  WAITING_DETAIL,
  createOpenWaHandler,
  normalizeQrDataUrl,
} from "./openwa-http.mjs";
import {
  OPENWA_CREATE_CONFIG,
  detailFromLaunchError,
} from "./openwa-launch.mjs";

const require = createRequire(import.meta.url);
const port = Number(process.env.OPENWA_PORT ?? 43201);
const token = process.env.OPENWA_TOKEN ?? "";

let openWa;
try {
  openWa = require("@open-wa/wa-automate");
} catch {
  console.error(
    "Paket @open-wa/wa-automate belum terpasang.\nJalankan: npm install @open-wa/wa-automate --no-save\nlalu npm run openwa lagi.",
  );
  process.exit(1);
}

const state = {
  client: null,
  ready: false,
  detail: WAITING_DETAIL,
  qrDataUrl: null,
};

function captureQr(qrcode) {
  const dataUrl = normalizeQrDataUrl(qrcode);
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
  state.detail = `Sesi terputus${reason ? ` (${reason})` : ""}. Scan ulang dari /admin/setting.`;
  console.log(state.detail);
}

if (typeof openWa.ev?.on === "function") {
  openWa.ev.on("qr.**", captureQr);
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
  console.log("QR: buka /admin/setting di browser pada Mac ini, atau http://127.0.0.1:" + port + "/");
});

openWa
  .create({
    ...OPENWA_CREATE_CONFIG,
    catchQR: captureQr,
  })
  .then((client) => {
    markReady(client);
    if (typeof client.onStateChanged === "function") {
      client.onStateChanged((next) => {
        if (next === "UNPAIRED" || next === "UNLAUNCHED" || next === "CONFLICT") {
          markDisconnected(next);
          return;
        }
        if (next === "CONNECTED" || next === "ONLINE") {
          markReady(client);
        }
      });
    }
  })
  .catch((error) => {
    state.ready = false;
    state.qrDataUrl = null;
    state.detail = detailFromLaunchError(error);
    console.error(state.detail);
  });
