"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  classifySidecarPanel,
  sidecarHealthUrl,
  sidecarQrJsonUrl,
  type SidecarPanelView,
} from "@/lib/openwa/sidecar-browser";

type HealthBody = {
  ready?: boolean;
  detail?: string;
};

type QrBody = {
  ready?: boolean;
  detail?: string;
  qrDataUrl?: string | null;
};

type PanelState = { kind: "checking" } | SidecarPanelView;

const POLL_MS = 2500;

export function WhatsAppQrPanel({ sidecarUrl }: { sidecarUrl: string }) {
  const [panel, setPanel] = useState<PanelState>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const snapshot = await readSidecarSnapshot(sidecarUrl);
      if (!cancelled) setPanel(classifySidecarPanel(snapshot));
    }

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sidecarUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan WhatsApp FortyFit</CardTitle>
        <CardDescription>
          QR di-scan dari HP nomor pengirim (WhatsApp FortyFit). Field nomor
          admin di bawah halaman ini adalah penerima digest, bukan nomor yang
          di-scan.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <StatusRow panel={panel} />
        <PanelBody panel={panel} sidecarUrl={sidecarUrl} />
        <p className="text-sm leading-6 text-muted-foreground">
          Dua nomor, dua tugas: QR = pengirim (nomor WA FortyFit yang menautkan
          perangkat). Nomor admin = penerima ringkasan pagi dan notice.
        </p>
      </CardContent>
    </Card>
  );
}

async function readSidecarSnapshot(sidecarUrl: string): Promise<{
  healthOk: boolean;
  ready?: boolean;
  detail?: string;
  qrDataUrl?: string | null;
}> {
  let healthOk = false;
  let ready = false;
  let detail: string | undefined;
  let qrDataUrl: string | null = null;

  try {
    const healthRes = await fetch(sidecarHealthUrl(sidecarUrl), {
      cache: "no-store",
    });
    if (!healthRes.ok) {
      return { healthOk: false };
    }
    healthOk = true;
    const health = (await healthRes.json()) as HealthBody;
    ready = Boolean(health.ready);
    detail = health.detail;
  } catch {
    return { healthOk: false };
  }

  if (ready) {
    return { healthOk, ready, detail, qrDataUrl: null };
  }

  try {
    const qrRes = await fetch(sidecarQrJsonUrl(sidecarUrl), {
      cache: "no-store",
    });
    if (qrRes.ok) {
      const qr = (await qrRes.json()) as QrBody;
      if (qr.ready) ready = true;
      if (qr.detail) detail = qr.detail;
      if (typeof qr.qrDataUrl === "string") qrDataUrl = qr.qrDataUrl;
    }
  } catch {
    // Health already proved the sidecar is up. Missing QR is waiting, not down.
  }

  return { healthOk, ready, detail, qrDataUrl };
}

function panelLabel(panel: PanelState): string {
  switch (panel.kind) {
    case "ready":
      return "tersambung";
    case "qr":
      return "menunggu scan";
    case "waiting":
      return "menunggu QR";
    case "checking":
      return "mengecek";
    case "unreachable":
      return "tidak terjangkau";
    default: {
      const _exhaustive: never = panel;
      return _exhaustive;
    }
  }
}

function StatusRow({ panel }: { panel: PanelState }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={panel.kind === "ready" ? "secondary" : "outline"}>
        {panelLabel(panel)}
      </Badge>
    </div>
  );
}

function PanelBody({
  panel,
  sidecarUrl,
}: {
  panel: PanelState;
  sidecarUrl: string;
}) {
  switch (panel.kind) {
    case "unreachable":
      return <SidecarUnreachableMessage sidecarUrl={sidecarUrl} />;
    case "checking":
      return (
        <p className="text-sm leading-6 text-muted-foreground">
          Mengecek sidecar di laptop ini…
        </p>
      );
    case "waiting":
      return <WaitingForQr detail={panel.detail} />;
    case "qr":
      return <ReadyQr qrDataUrl={panel.qrDataUrl} detail={panel.detail} />;
    case "ready":
      return (
        <p className="text-sm leading-6 text-muted-foreground">{panel.detail}</p>
      );
    default: {
      const _exhaustive: never = panel;
      return _exhaustive;
    }
  }
}

function WaitingForQr({ detail }: { detail: string }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      <p className="text-sm leading-6 text-muted-foreground">
        Sidecar sudah nyala. Belum ada kode untuk di-scan. Buka halaman ini di
        Chrome pada Mac yang menjalankan npm run openwa — bukan dari HP.
      </p>
    </div>
  );
}

function ReadyQr({ qrDataUrl, detail }: { qrDataUrl: string; detail: string }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      <p className="text-sm leading-6 text-muted-foreground">
        Dari HP FortyFit buka WhatsApp → Setelan → Perangkat tertaut, lalu scan
        kode ini. QR yang sama juga muncul di jendela Chrome yang dibuka sidecar
        di Mac. Tidak perlu membaca terminal.
      </p>
      <div className="flex size-[280px] items-center justify-center rounded-xl bg-white p-3">
        {/* data URL from sidecar JSON — next/image cannot load 127.0.0.1 from Vercel */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR WhatsApp FortyFit"
          width={256}
          height={256}
          className="size-64 object-contain"
        />
      </div>
    </div>
  );
}

function SidecarUnreachableMessage({ sidecarUrl }: { sidecarUrl: string }) {
  return (
    <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
      <p>
        Browser ini tidak menjangkau sidecar di {sidecarUrl}. Itu terjadi kalau
        sidecar belum nyala, fetch localhost diblokir, atau halaman ini dibuka
        dari HP — HP tidak melihat 127.0.0.1 di Mac. Buka Setting di Chrome pada
        Mac yang menjalankan npm run openwa.
      </p>
      <p>Di folder repo FortyFit, pada Mac studio, jalankan:</p>
      <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
        {`npm install @open-wa/wa-automate --no-save
npm run openwa`}
      </pre>
      <p>
        Biarkan terminal terbuka. Kalau TimeoutError sebelum QR, hapus folder
        _IGNORE_fortyfit di repo lalu jalankan npm run openwa lagi.
      </p>
    </div>
  );
}
