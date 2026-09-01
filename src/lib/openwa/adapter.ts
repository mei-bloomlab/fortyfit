import {
  ADMIN_MANUAL_KIND,
  ADMIN_NOTICE_KIND,
  buildAdminManualMessage,
  buildLowSessionMessage,
  reminderCoversRemaining,
} from "@/lib/openwa/messages";

export type WhatsAppMode = "enqueue" | "live";

export type WhatsAppStatus = {
  mode: WhatsAppMode;
  ready: boolean;
  detail: string;
};

export type WhatsAppSendResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

export interface WhatsAppAdapter {
  status(): Promise<WhatsAppStatus>;
  sendText(phone: string, message: string): Promise<WhatsAppSendResult>;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export function toChatId(phone: string): string {
  return `${normalizePhone(phone)}@c.us`;
}

export function openWaConfig() {
  return {
    mode: process.env.OPENWA_MODE === "live" ? "live" : "enqueue",
    url: (process.env.OPENWA_URL ?? "http://127.0.0.1:43201").replace(/\/$/, ""),
    token: process.env.OPENWA_TOKEN ?? "",
  } as const;
}

export function isSidecarUnreachableError(error?: string | null): boolean {
  if (!error) return false;
  const text = error.toLowerCase();
  return (
    text.includes("tidak terjangkau") ||
    text.includes("tidak bisa menghubungi") ||
    text.includes("sidecar belum") ||
    text.includes("antrian neon") ||
    text.includes("belum live") ||
    text.includes("enqueue")
  );
}

export function shouldCountDispatchAttempt(input: {
  sidecarReady: boolean;
  sendOk: boolean;
  error?: string | null;
}): boolean {
  if (!input.sidecarReady) return false;
  if (input.sendOk) return true;
  return !isSidecarUnreachableError(input.error);
}

class EnqueueWhatsAppAdapter implements WhatsAppAdapter {
  async status(): Promise<WhatsAppStatus> {
    return {
      mode: "enqueue",
      ready: false,
      detail:
        "Vercel hanya menulis antrian Neon. Pengiriman WhatsApp jalan dari laptop studio (npm run openwa), bukan dari server.",
    };
  }

  async sendText(phone: string, message: string): Promise<WhatsAppSendResult> {
    if (!phone.trim() || !message.trim()) {
      return { ok: false, error: "Nomor WhatsApp atau isi pesan kosong" };
    }
    return {
      ok: false,
      error: "OpenWA sidecar belum live. Pesan tetap pending di antrian Neon.",
    };
  }
}

export class LiveWhatsAppAdapter implements WhatsAppAdapter {
  private config = openWaConfig();

  private headers() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }
    return headers;
  }

  async status(): Promise<WhatsAppStatus> {
    try {
      const response = await fetch(`${this.config.url}/health`, {
        headers: this.headers(),
        cache: "no-store",
      });
      if (!response.ok) {
        return {
          mode: "live",
          ready: false,
          detail: `OpenWA merespons ${response.status}. Cek sidecar di ${this.config.url}.`,
        };
      }
      const body = (await response.json()) as { ready?: boolean; detail?: string };
      return {
        mode: "live",
        ready: Boolean(body.ready),
        detail:
          body.detail ??
          (body.ready
            ? `Tersambung ke OpenWA di ${this.config.url}`
            : "OpenWA belum siap. Scan QR di /admin/setting."),
      };
    } catch {
      return {
        mode: "live",
        ready: false,
        detail: `Tidak bisa menghubungi OpenWA di ${this.config.url}. Laptop studio harus menjalankan npm run openwa.`,
      };
    }
  }

  async sendText(phone: string, message: string): Promise<WhatsAppSendResult> {
    try {
      const response = await fetch(`${this.config.url}/send`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ phone, message }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };
      if (!response.ok || !body.ok) {
        return {
          ok: false,
          error: body.error ?? `OpenWA menolak kirim (${response.status})`,
        };
      }
      return { ok: true, id: body.id };
    } catch {
      return {
        ok: false,
        error: `OpenWA tidak terjangkau di ${this.config.url}`,
      };
    }
  }
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  return openWaConfig().mode === "live"
    ? new LiveWhatsAppAdapter()
    : new EnqueueWhatsAppAdapter();
}

export function getSidecarWhatsAppAdapter(): WhatsAppAdapter {
  return new LiveWhatsAppAdapter();
}

export {
  ADMIN_MANUAL_KIND,
  ADMIN_NOTICE_KIND,
  buildAdminManualMessage,
  buildLowSessionMessage,
  reminderCoversRemaining,
};
