import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DEFAULT_SIDECAR_URL,
  browserSidecarUrl,
  sidecarHealthUrl,
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
    assert.doesNotMatch(name, /open-wa|wa-automate|puppeteer|chromium/i);
  }
});
