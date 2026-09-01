export const DEFAULT_SIDECAR_URL = "http://127.0.0.1:43201";

export const QR_WAITING_COPY =
  "QR muncul setelah sidecar Baileys menerbitkannya. Tidak ada jendela Chrome.";

export const SIDECAR_INSTALL_COMMAND = `npm install @whiskeysockets/baileys qrcode --no-save
npm run openwa`;

export function browserSidecarUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (env.OPENWA_URL ?? DEFAULT_SIDECAR_URL).replace(/\/$/, "");
}

export function sidecarHealthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/health`;
}

export function sidecarQrSrc(baseUrl: string, nonce: number | string): string {
  return `${baseUrl.replace(/\/$/, "")}/qr?t=${nonce}`;
}

export function sidecarQrJsonUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/qr?format=json`;
}

export function sidecarLogoutUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/logout`;
}

export const RESET_SESSION_COPY = "Lepas tautan & scan ulang";

export const RESET_SESSION_HINT =
  "Pakai ini kalau QR ke-scan dari nomor yang salah. Perangkat lama dilepas dari WhatsApp, sesi lokal dihapus, lalu QR baru muncul di panel ini.";

export type SidecarPanelView =
  | { kind: "unreachable" }
  | { kind: "waiting"; detail: string }
  | { kind: "qr"; detail: string; qrDataUrl: string }
  | { kind: "ready"; detail: string };

export function normalizeSidecarQrDataUrl(
  qrDataUrl: string | null | undefined,
): string | null {
  if (typeof qrDataUrl !== "string") return null;
  const text = qrDataUrl.trim();
  return text.length > 0 ? text : null;
}

/**
 * health 200 is "sidecar up". A missing QR or a failed /qr fetch is not "sidecar mati".
 */
export function classifySidecarPanel(input: {
  healthOk: boolean;
  ready?: boolean;
  detail?: string;
  qrDataUrl?: string | null;
}): SidecarPanelView {
  if (!input.healthOk) {
    return { kind: "unreachable" };
  }
  if (input.ready) {
    return {
      kind: "ready",
      detail: input.detail ?? "WhatsApp FortyFit tersambung.",
    };
  }
  const qrDataUrl = normalizeSidecarQrDataUrl(input.qrDataUrl);
  if (qrDataUrl) {
    return {
      kind: "qr",
      detail: input.detail ?? "QR siap.",
      qrDataUrl,
    };
  }
  return {
    kind: "waiting",
    detail: QR_WAITING_COPY,
  };
}
