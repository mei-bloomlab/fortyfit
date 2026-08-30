import assert from "node:assert/strict";
import test from "node:test";
import {
  MAC_CHROME_EXECUTABLE,
  OPENWA_CREATE_CONFIG,
  SESSION_DIR,
  SESSION_ID,
  buildOpenWaCreateConfig,
  detailFromLaunchError,
  resolveChromeExecutablePath,
} from "./openwa-launch.mjs";

test("sidecar launches system Chrome with a visible window and no QR timeout", () => {
  assert.equal(OPENWA_CREATE_CONFIG.sessionId, SESSION_ID);
  assert.equal(OPENWA_CREATE_CONFIG.useChrome, true);
  assert.equal(OPENWA_CREATE_CONFIG.headless, false);
  assert.equal(OPENWA_CREATE_CONFIG.authTimeout, 0);
  assert.equal(OPENWA_CREATE_CONFIG.qrTimeout, 0);
  assert.equal(OPENWA_CREATE_CONFIG.waitForRipeSessionTimeout, 0);
  assert.equal(OPENWA_CREATE_CONFIG.waitForRipeSession, false);
  assert.equal(OPENWA_CREATE_CONFIG.killProcessOnTimeout, false);
});

test("CHROME_PATH sets executablePath on any platform", () => {
  const env = { CHROME_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" };
  assert.equal(resolveChromeExecutablePath(env, "linux"), env.CHROME_PATH);
  const config = buildOpenWaCreateConfig(env, "linux");
  assert.equal(config.executablePath, env.CHROME_PATH);
  assert.equal(config.useChrome, true);
  assert.equal(config.headless, false);
});

test("unset CHROME_PATH on macOS uses installed Google Chrome", () => {
  const config = buildOpenWaCreateConfig({}, "darwin");
  assert.equal(config.executablePath, MAC_CHROME_EXECUTABLE);
});

test("unset CHROME_PATH on non-Mac omits executablePath", () => {
  assert.equal(resolveChromeExecutablePath({}, "linux"), undefined);
  const config = buildOpenWaCreateConfig({}, "linux");
  assert.equal("executablePath" in config, false);
  assert.equal(config.useChrome, true);
});

test("launch timeout copy tells Maura to delete the session folder", () => {
  const detail = detailFromLaunchError(
    new Error("TimeoutError: Waiting failed: 30000ms exceeded"),
  );
  assert.match(detail, new RegExp(SESSION_DIR));
  assert.match(detail, /npm run openwa/);
  assert.doesNotMatch(detail, /30000ms exceeded/);
});
