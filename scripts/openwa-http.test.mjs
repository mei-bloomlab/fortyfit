import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  READY_DETAIL,
  SCAN_HINT,
  WAITING_DETAIL,
  createOpenWaHandler,
  normalizeQrDataUrl,
  pngBufferFromDataUrl,
} from "./openwa-http.mjs";

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function listen(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        base: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function withServer(state, token, run) {
  const { server, base } = await listen(
    createOpenWaHandler({
      getState: () => state,
      token,
      port: 43201,
    }),
  );
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("normalizeQrDataUrl accepts raw base64 and data URLs", () => {
  assert.equal(normalizeQrDataUrl(PNG_DATA_URL), PNG_DATA_URL);
  const raw = PNG_DATA_URL.split(",")[1];
  assert.equal(normalizeQrDataUrl(raw), PNG_DATA_URL);
  assert.equal(normalizeQrDataUrl(""), null);
});

test("pngBufferFromDataUrl decodes a real PNG", () => {
  const buf = pngBufferFromDataUrl(PNG_DATA_URL);
  assert.ok(buf);
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});

test("GET /health and GET / are public even with a token", async () => {
  await withServer(
    { ready: false, detail: WAITING_DETAIL, qrDataUrl: null, client: null },
    "secret",
    async (base) => {
      const health = await fetch(`${base}/health`);
      assert.equal(health.status, 200);
      const body = await health.json();
      assert.equal(body.ready, false);
      assert.match(body.detail, /QR/);

      const page = await fetch(`${base}/`);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /Scan WhatsApp FortyFit/);
      assert.match(html, new RegExp(SCAN_HINT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(html, /Internal Server Error|HTTP 500/);
    },
  );
});

test("GET /qr serves PNG while waiting and drops stale QR after ready", async () => {
  const state = {
    ready: false,
    detail: "QR siap",
    qrDataUrl: PNG_DATA_URL,
    client: null,
  };

  await withServer(state, "", async (base) => {
    const waiting = await fetch(`${base}/qr`);
    assert.equal(waiting.status, 200);
    assert.equal(waiting.headers.get("content-type"), "image/png");
    const png = Buffer.from(await waiting.arrayBuffer());
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

    const asJson = await fetch(`${base}/qr?format=json`);
    const payload = await asJson.json();
    assert.equal(payload.ready, false);
    assert.equal(payload.qrDataUrl, PNG_DATA_URL);

    state.ready = true;
    state.detail = READY_DETAIL;

    const readyImg = await fetch(`${base}/qr`);
    assert.equal(readyImg.status, 200);
    assert.match(String(readyImg.headers.get("content-type")), /image\/svg\+xml/);
    const svg = await readyImg.text();
    assert.match(svg, /Tersambung/);
    assert.doesNotMatch(svg, /iVBORw0KGgo/);

    const readyJson = await fetch(`${base}/qr?format=json`);
    const readyPayload = await readyJson.json();
    assert.equal(readyPayload.ready, true);
    assert.equal(readyPayload.qrDataUrl, null);
    assert.equal(readyPayload.detail, READY_DETAIL);
  });
});

test("CORS and private-network preflight succeed from a public admin origin", async () => {
  await withServer(
    { ready: true, detail: READY_DETAIL, qrDataUrl: PNG_DATA_URL, client: null },
    "",
    async (base) => {
      const origin = "https://fortyfit-rose.vercel.app";
      const preflight = await fetch(`${base}/health`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Private-Network": "true",
        },
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
      assert.equal(
        preflight.headers.get("access-control-allow-private-network"),
        "true",
      );

      const health = await fetch(`${base}/health`, { headers: { Origin: origin } });
      assert.equal(health.headers.get("access-control-allow-origin"), origin);
    },
  );
});

test("POST /send stays token-protected and does not send before ready", async () => {
  await withServer(
    { ready: false, detail: WAITING_DETAIL, qrDataUrl: null, client: null },
    "secret",
    async (base) => {
      const denied = await fetch(`${base}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "0812", message: "hai" }),
      });
      assert.equal(denied.status, 401);

      const waiting = await fetch(`${base}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret",
        },
        body: JSON.stringify({ phone: "0812", message: "hai" }),
      });
      assert.equal(waiting.status, 503);
      const body = await waiting.json();
      assert.equal(body.ok, false);
    },
  );
});
