import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DEFAULT_SIDECAR_URL,
  QR_WAITING_COPY,
  SIDECAR_INSTALL_COMMAND,
  browserSidecarUrl,
  classifySidecarPanel,
  sidecarHealthUrl,
  sidecarQrJsonUrl,
  sidecarQrSrc,
} from "./sidecar-browser";

test("browser sidecar URL defaults to laptop localhost", () => {
  assert.equal(browserSidecarUrl({}), DEFAULT_SIDECAR_URL);
  assert.equal(
    browserSidecarUrl({ OPENWA_URL: "http://127.0.0.1:43201/" }),
    "http://127.0.0.1:43201",
  );
  assert.equal(
    browserSidecarUrl({ OPENWA_URL: "http://127.0.0.1:49999" }),
    "http://127.0.0.1:49999",
  );
});

test("health and QR stay on the sidecar host", () => {
  assert.equal(
    sidecarHealthUrl("http://127.0.0.1:43201"),
    "http://127.0.0.1:43201/health",
  );
  assert.equal(
    sidecarQrSrc("http://127.0.0.1:43201/", 99),
    "http://127.0.0.1:43201/qr?t=99",
  );
  assert.equal(
    sidecarQrJsonUrl("http://127.0.0.1:43201"),
    "http://127.0.0.1:43201/qr?format=json",
  );
});

test("panel treats health 200 without QR as waiting, not sidecar down", () => {
  assert.equal(classifySidecarPanel({ healthOk: false }).kind, "unreachable");
  assert.equal(
    classifySidecarPanel({
      healthOk: true,
      ready: false,
      qrDataUrl: "",
      detail: "Menunggu QR WhatsApp.",
    }).kind,
    "waiting",
  );
  const waiting = classifySidecarPanel({
    healthOk: true,
    ready: false,
    qrDataUrl: null,
  });
  assert.equal(waiting.kind, "waiting");
  if (waiting.kind === "waiting") {
    assert.match(waiting.detail, /Baileys/);
    assert.match(waiting.detail, /Tidak ada jendela Chrome/);
    assert.equal(waiting.detail.includes(QR_WAITING_COPY), true);
  }

  const qr = classifySidecarPanel({
    healthOk: true,
    ready: false,
    qrDataUrl: "data:image/png;base64,abc",
    detail: "QR siap.",
  });
  assert.equal(qr.kind, "qr");
  if (qr.kind === "qr") {
    assert.equal(qr.qrDataUrl, "data:image/png;base64,abc");
  }

  const ready = classifySidecarPanel({
    healthOk: true,
    ready: true,
    qrDataUrl: "data:image/png;base64,stale",
    detail: "WhatsApp FortyFit tersambung.",
  });
  assert.equal(ready.kind, "ready");
});

test("sidecar install is Baileys --no-save, not OpenWA or Chrome", () => {
  assert.match(SIDECAR_INSTALL_COMMAND, /@whiskeysockets\/baileys/);
  assert.match(SIDECAR_INSTALL_COMMAND, /--no-save/);
  assert.doesNotMatch(SIDECAR_INSTALL_COMMAND, /open-wa|puppeteer|chrome/i);
});

test("production package.json does not depend on open-wa or puppeteer", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  const names = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ];
  for (const name of names) {
    assert.doesNotMatch(name, /open-wa|wa-automate|puppeteer|chromium|baileys/i);
  }
});
