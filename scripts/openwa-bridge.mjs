import { createServer } from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const port = Number(process.env.OPENWA_PORT ?? 43201);
const token = process.env.OPENWA_TOKEN ?? "";

function normalizePhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

function authorize(req) {
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

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
  detail: "Menunggu QR WhatsApp. Scan dari HP: Setelan → Perangkat tertaut.",
};

const server = createServer(async (req, res) => {
  if (!authorize(req)) {
    json(res, 401, { ok: false, error: "Token OpenWA salah" });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    json(res, 200, {
      ready: state.ready,
      detail: state.detail,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/send") {
    if (!state.ready || !state.client) {
      json(res, 503, { ok: false, error: state.detail });
      return;
    }

    try {
      const body = await readBody(req);
      const phone = normalizePhone(body.phone);
      const message = String(body.message ?? "").trim();
      if (!phone || !message) {
        json(res, 400, { ok: false, error: "phone dan message wajib" });
        return;
      }
      const id = await state.client.sendText(`${phone}@c.us`, message);
      json(res, 200, { ok: true, id });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal kirim OpenWA",
      });
    }
    return;
  }

  json(res, 404, { ok: false, error: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`OpenWA bridge http://127.0.0.1:${port}`);
});

openWa
  .create({
    sessionId: "fortyfit",
    multiDevice: true,
    authTimeout: 60,
    blockCrashLogs: true,
    disableSpins: true,
    headless: true,
    qrTimeout: 0,
    cachedPatch: true,
  })
  .then((client) => {
    state.client = client;
    state.ready = true;
    state.detail = "WhatsApp tersambung. Reminder dari /admin/reminders bisa dikirim.";
    console.log(state.detail);
  })
  .catch((error) => {
    state.ready = false;
    state.detail = error instanceof Error ? error.message : "Gagal start OpenWA";
    console.error(state.detail);
  });
