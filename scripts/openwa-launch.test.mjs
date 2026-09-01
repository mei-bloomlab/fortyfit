import assert from "node:assert/strict";
import test from "node:test";
import {
  BAILEYS_INSTALL,
  BAILEYS_PACKAGE,
  MISSING_BAILEYS_COPY,
  RESET_BUTTON_COPY,
  SESSION_DIR,
  SESSION_ID,
  baileysQrToDataUrl,
  createBaileysSender,
  detailFromLaunchError,
  resolveBaileysExports,
  shouldReconnectBaileys,
  toBaileysJid,
  unlinkBaileysSocket,
} from "./openwa-launch.mjs";

test("sidecar session stays local and named for FortyFit", () => {
  assert.equal(SESSION_ID, "fortyfit");
  assert.equal(SESSION_DIR, "_IGNORE_baileys");
  assert.match(BAILEYS_INSTALL, /--no-save/);
  assert.match(BAILEYS_INSTALL, new RegExp(BAILEYS_PACKAGE.replace("/", "\\/")));
  assert.doesNotMatch(BAILEYS_INSTALL, /open-wa|puppeteer|chrome/i);
});

test("missing Baileys copy tells Maura the --no-save install, not Chrome", () => {
  const detail = detailFromLaunchError(
    new Error("Cannot find module '@whiskeysockets/baileys'"),
  );
  assert.equal(detail, MISSING_BAILEYS_COPY);
  assert.match(detail, /npm install @whiskeysockets\/baileys qrcode --no-save/);
  assert.doesNotMatch(detail, /Chrome|Puppeteer|executablePath/);
});

test("logged-out copy offers the reset button before the manual folder fix", () => {
  const detail = detailFromLaunchError(new Error("logged out"));
  assert.match(detail, new RegExp(RESET_BUTTON_COPY));
  assert.match(detail, new RegExp(SESSION_DIR));
  assert.match(detail, /\/admin\/setting/);
});

test("unlink survives a socket that already lost its connection", async () => {
  const ended = [];
  await unlinkBaileysSocket({
    async logout() {
      throw new Error("Connection Closed");
    },
    end(error) {
      ended.push(error);
    },
  });
  assert.deepEqual(ended, [undefined]);

  const order = [];
  await unlinkBaileysSocket({
    async logout() {
      order.push("logout");
    },
    end() {
      order.push("end");
    },
  });
  assert.deepEqual(order, ["logout", "end"]);

  await unlinkBaileysSocket(null);
});

test("resolveBaileysExports accepts default or named makeWASocket", () => {
  const named = resolveBaileysExports({
    makeWASocket: () => "named",
    useMultiFileAuthState: async () => ({}),
    DisconnectReason: { loggedOut: 401 },
  });
  assert.equal(named.makeWASocket(), "named");
  assert.equal(named.DisconnectReason.loggedOut, 401);

  const def = resolveBaileysExports({
    default: () => "default",
    useMultiFileAuthState: async () => ({}),
  });
  assert.equal(def.makeWASocket(), "default");
});

test("Baileys QR string becomes a PNG data URL via the renderer", async () => {
  const dataUrl = await baileysQrToDataUrl("2@example-qr", async (text) => {
    assert.equal(text, "2@example-qr");
    return "data:image/png;base64,abc";
  });
  assert.equal(dataUrl, "data:image/png;base64,abc");
  assert.equal(await baileysQrToDataUrl("", async () => "data:image/png;base64,x"), null);
});

test("sender maps OpenWA @c.us chat ids to Baileys JIDs", async () => {
  assert.equal(toBaileysJid("62812@c.us"), "62812@s.whatsapp.net");
  assert.equal(toBaileysJid("62812@s.whatsapp.net"), "62812@s.whatsapp.net");

  const sock = {
    async sendMessage(jid, payload) {
      assert.equal(jid, "6285155070866@s.whatsapp.net");
      assert.equal(payload.text, "halo");
      return { key: { id: "wamid.1" } };
    },
  };
  const client = createBaileysSender(sock);
  assert.equal(await client.sendText("6285155070866@c.us", "halo"), "wamid.1");
});

test("reconnect after drop, not after logout", () => {
  const DisconnectReason = { loggedOut: 401 };
  assert.equal(
    shouldReconnectBaileys({ error: { output: { statusCode: 515 } } }, DisconnectReason),
    true,
  );
  assert.equal(
    shouldReconnectBaileys({ error: { output: { statusCode: 401 } } }, DisconnectReason),
    false,
  );
});
