export type WhatsAppStatus = {
  mode: "mock" | "live";
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
    mode: process.env.OPENWA_MODE === "live" ? "live" : "mock",
    url: (process.env.OPENWA_URL ?? "http://127.0.0.1:43201").replace(/\/$/, ""),
    token: process.env.OPENWA_TOKEN ?? "",
  } as const;
}

class MockWhatsAppAdapter implements WhatsAppAdapter {
  async status(): Promise<WhatsAppStatus> {
    return {
      mode: "mock",
      ready: true,
      detail:
        "Masih mock. Pesan tercatat di antrian, belum keluar ke HP. Untuk live, jalankan npm run openwa lalu set OPENWA_MODE=live.",
    };
  }

  async sendText(phone: string, message: string): Promise<WhatsAppSendResult> {
    if (!phone.trim()) {
      return { ok: false, error: "Nomor WhatsApp kosong" };
    }
    return {
      ok: true,
      id: `mock:${toChatId(phone)}:${Buffer.from(message).toString("base64").slice(0, 8)}`,
    };
  }
}

class LiveWhatsAppAdapter implements WhatsAppAdapter {
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
            : "OpenWA belum siap. Scan QR di terminal sidecar."),
      };
    } catch {
      return {
        mode: "live",
        ready: false,
        detail: `Tidak bisa menghubungi OpenWA di ${this.config.url}. Jalankan npm run openwa di laptop/VPS studio.`,
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
    : new MockWhatsAppAdapter();
}

export const ADMIN_NOTICE_KIND = "low_sessions";
export const CUSTOMER_MANUAL_KIND = "customer_manual";

export function buildLowSessionMessage(input: {
  name: string;
  phone: string;
  remaining: number;
  program: string;
}): string {
  return [
    `Notice FortyFit: ${input.name} (${input.phone})`,
    `sisa ${input.remaining} sesi ${input.program}.`,
    input.remaining === 0
      ? "Paket sudah habis. Follow-up perpanjang."
      : `Tinggal ${input.remaining}x lagi habis. Follow-up perpanjang.`,
  ].join(" ");
}

export function reminderCoversRemaining(payload: string, remaining: number) {
  return payload.includes(`sisa ${remaining} sesi`);
}

export function buildCustomerManualMessage(input: {
  name: string;
  remaining: number;
  program: string;
}): string {
  const sisa =
    input.remaining <= 0
      ? "Paket sesimu sudah habis."
      : `Sisa sesimu ${input.remaining} untuk program ${input.program}.`;
  return [
    `Hai ${input.name}, ini pengingat dari FortyFit Studio Tabanan.`,
    sisa,
    "Yuk datang latihan sesuai jadwal, atau kabari kami kalau perlu reschedule.",
  ].join(" ");
}
