export const SESSION_ID = "fortyfit";
export const SESSION_DIR = "_IGNORE_baileys";
export const BAILEYS_PACKAGE = "@whiskeysockets/baileys";
export const QRCODE_PACKAGE = "qrcode";

export const BAILEYS_INSTALL = `npm install ${BAILEYS_PACKAGE} ${QRCODE_PACKAGE} --no-save`;

export const MISSING_BAILEYS_COPY = `Paket ${BAILEYS_PACKAGE} belum terpasang.\nJalankan: ${BAILEYS_INSTALL}\nlalu npm run openwa lagi.`;

export function resolveBaileysExports(mod) {
  const nested = mod?.default && typeof mod.default === "object" ? mod.default : {};
  const makeWASocket =
    typeof mod?.makeWASocket === "function"
      ? mod.makeWASocket
      : typeof mod?.default === "function"
        ? mod.default
        : nested.makeWASocket;
  return {
    makeWASocket,
    useMultiFileAuthState:
      mod?.useMultiFileAuthState ?? nested.useMultiFileAuthState,
    DisconnectReason: mod?.DisconnectReason ?? nested.DisconnectReason ?? {},
  };
}

export function disconnectStatusCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode;
}

export function shouldReconnectBaileys(lastDisconnect, DisconnectReason = {}) {
  const loggedOut = DisconnectReason.loggedOut ?? 401;
  return disconnectStatusCode(lastDisconnect) !== loggedOut;
}

export function toBaileysJid(chatId) {
  const raw = String(chatId ?? "");
  if (raw.endsWith("@s.whatsapp.net") || raw.endsWith("@g.us")) return raw;
  const digits = raw.replace(/@c\.us$/, "").replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export function createBaileysSender(sock) {
  return {
    async sendText(chatId, message) {
      const sent = await sock.sendMessage(toBaileysJid(chatId), {
        text: String(message ?? ""),
      });
      return sent?.key?.id ?? sent?.id;
    },
  };
}

export async function baileysQrToDataUrl(qr, toDataUrl) {
  const text = String(qr ?? "").trim();
  if (!text || typeof toDataUrl !== "function") return null;
  const dataUrl = await toDataUrl(text, { width: 256, margin: 1 });
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return null;
  }
  return dataUrl;
}

export function detailFromLaunchError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/cannot find module|not found/i.test(message) && /baileys|qrcode/i.test(message)) {
    return MISSING_BAILEYS_COPY;
  }
  if (/logged.?out|unpaired/i.test(message)) {
    return `Sesi terputus. Hapus folder ${SESSION_DIR} di repo, lalu npm run openwa lagi dan scan QR di /admin/setting.`;
  }
  return message || "Gagal start sidecar WhatsApp";
}
