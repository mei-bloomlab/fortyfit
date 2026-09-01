export const SCAN_HINT =
  "Scan dari HP FortyFit → WhatsApp → Setelan → Perangkat tertaut.";

export const WAITING_DETAIL = `Menunggu QR WhatsApp. ${SCAN_HINT}`;
export const READY_DETAIL =
  "WhatsApp tersambung. Reminder dari /admin/reminders bisa dikirim.";

const PUBLIC_GET_PATHS = new Set(["/", "/qr", "/health"]);

export function normalizeQrDataUrl(qrcode) {
  if (qrcode == null) return null;
  const text = String(qrcode).trim();
  if (!text) return null;
  if (text.startsWith("data:image/")) return text;
  return `data:image/png;base64,${text}`;
}

export function pngBufferFromDataUrl(dataUrl) {
  const normalized = normalizeQrDataUrl(dataUrl);
  if (!normalized) return null;
  const comma = normalized.indexOf(",");
  const base64 = comma === -1 ? normalized : normalized.slice(comma + 1);
  try {
    const buf = Buffer.from(base64, "base64");
    return buf.length > 32 ? buf : null;
  } catch {
    return null;
  }
}

export function applyCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Access-Control-Request-Private-Network, Access-Control-Request-Local-Network",
  );
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Access-Control-Allow-Local-Network", "true");
}

export function requestUrl(req, port) {
  return new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
}

export function isPublicGet(method, pathname) {
  return method === "GET" && PUBLIC_GET_PATHS.has(pathname);
}

export function authorizeRequest(req, token, pathname) {
  if (!token) return true;
  if (req.method === "GET" && PUBLIC_GET_PATHS.has(pathname)) return true;
  if (req.method === "OPTIONS") return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
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

export function statusSvg({ ready }) {
  const title = ready ? "Tersambung" : "Menunggu QR";
  const sub = ready
    ? "WhatsApp FortyFit siap mengirim."
    : "Sidecar nyala. QR belum ada atau sudah kadaluarsa.";
  const accent = ready ? "#1f7a4d" : "#6b5b3e";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280" role="img" aria-label="${title}">
  <rect width="280" height="280" rx="16" fill="#f6f4ef"/>
  <rect x="18" y="18" width="244" height="244" rx="12" fill="#fff" stroke="${accent}" stroke-width="2"/>
  <text x="140" y="132" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${accent}">${title}</text>
  <text x="140" y="168" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#5c564c">${sub}</text>
</svg>`;
}

export function scanPageHtml(port) {
  const sidecar = `http://127.0.0.1:${port}`;
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Scan WhatsApp FortyFit</title>
  <style>
    body { font-family: Georgia, serif; margin: 0; background: #f6f4ef; color: #2b261f; }
    main { max-width: 28rem; margin: 2.5rem auto; padding: 0 1.25rem; }
    h1 { font-size: 1.5rem; font-weight: 500; }
    p { line-height: 1.55; color: #5c564c; }
    .box { background: #fff; border-radius: 1rem; padding: 1rem; min-height: 17.5rem; display: flex; align-items: center; justify-content: center; }
    img { width: 16rem; height: 16rem; object-fit: contain; }
    code { font-size: 0.85em; }
  </style>
</head>
<body>
  <main>
    <h1>Scan WhatsApp FortyFit</h1>
    <p id="status">${WAITING_DETAIL}</p>
    <div class="box"><img id="qr" alt="QR WhatsApp FortyFit" src="/qr"/></div>
    <p>${SCAN_HINT}</p>
    <p>QR = nomor pengirim (WA FortyFit). Nomor admin di /admin/setting = penerima digest.</p>
    <p>Halaman ini hanya di laptop studio: <code>${sidecar}</code></p>
  </main>
  <script>
    const statusEl = document.getElementById("status");
    const qrEl = document.getElementById("qr");
    async function tick() {
      try {
        const res = await fetch("/health", { cache: "no-store" });
        const body = await res.json();
        statusEl.textContent = body.detail || (body.ready ? "Tersambung" : "Menunggu scan");
        qrEl.src = "/qr?t=" + Date.now();
      } catch {
        statusEl.textContent = "Sidecar tidak merespons. Jalankan npm run openwa di laptop.";
      }
    }
    tick();
    setInterval(tick, 2500);
  </script>
</body>
</html>`;
}

export function createOpenWaHandler({ getState, resetSession, token, port }) {
  return async function handler(req, res) {
    applyCors(req, res);
    const url = requestUrl(req, port);
    const pathname = url.pathname;

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!authorizeRequest(req, token, pathname)) {
      json(res, 401, { ok: false, error: "Token OpenWA salah" });
      return;
    }

    const state = getState();

    if (req.method === "GET" && pathname === "/health") {
      json(res, 200, {
        ready: Boolean(state.ready),
        detail: state.detail,
      });
      return;
    }

    if (req.method === "GET" && pathname === "/") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(scanPageHtml(port));
      return;
    }

    if (req.method === "GET" && pathname === "/qr") {
      const wantsJson =
        url.searchParams.get("format") === "json" ||
        String(req.headers.accept ?? "").includes("application/json");
      const liveQr = state.ready ? null : state.qrDataUrl;

      if (wantsJson) {
        json(res, 200, {
          ready: Boolean(state.ready),
          detail: state.detail,
          qrDataUrl: liveQr,
        });
        return;
      }

      const png = liveQr ? pngBufferFromDataUrl(liveQr) : null;
      if (png) {
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Cache-Control": "no-store",
        });
        res.end(png);
        return;
      }

      res.writeHead(200, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(statusSvg({ ready: Boolean(state.ready) }));
      return;
    }

    if (req.method === "POST" && pathname === "/logout") {
      if (typeof resetSession !== "function") {
        json(res, 501, {
          ok: false,
          error: "Sidecar ini belum bisa lepas tautan. Restart npm run openwa.",
        });
        return;
      }
      try {
        const detail = await resetSession();
        json(res, 200, { ok: true, detail });
      } catch (error) {
        json(res, 500, {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Gagal lepas tautan WhatsApp",
        });
      }
      return;
    }

    if (req.method === "POST" && pathname === "/send") {
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
  };
}

function normalizePhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}
