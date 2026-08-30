import assert from "node:assert/strict";
import test from "node:test";
import {
  OPENWA_CREATE_CONFIG,
  SESSION_DIR,
  SESSION_ID,
  detailFromLaunchError,
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

test("launch timeout copy tells Maura to delete the session folder", () => {
  const detail = detailFromLaunchError(
    new Error("TimeoutError: Waiting failed: 30000ms exceeded"),
  );
  assert.match(detail, new RegExp(SESSION_DIR));
  assert.match(detail, /npm run openwa/);
  assert.doesNotMatch(detail, /30000ms exceeded/);
});
