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
  sidecarHealthUrl,
  sidecarQrSrc,
} from "@/lib/openwa/sidecar-browser";

type Health = {
  ready: boolean;
  detail?: string;
};

type PanelState =
  | { kind: "checking" }
  | { kind: "down" }
  | { kind: "waiting"; detail: string; nonce: number }
  | { kind: "ready"; detail: string };

const POLL_MS = 2500;

export function WhatsAppQrPanel({ sidecarUrl }: { sidecarUrl: string }) {
  const [panel, setPanel] = useState<PanelState>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    let nonce = Date.now();

    async function tick() {
      try {
        const response = await fetch(sidecarHealthUrl(sidecarUrl), {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setPanel({ kind: "down" });
          return;
        }
        const body = (await response.json()) as Health;
        if (cancelled) return;
        if (body.ready) {
          setPanel({
            kind: "ready",
            detail: body.detail ?? "WhatsApp FortyFit tersambung.",
          });
          return;
        }
        nonce += 1;
        setPanel({
          kind: "waiting",
          detail: body.detail ?? "Menunggu QR WhatsApp.",
          nonce,
        });
      } catch {
        if (!cancelled) setPanel({ kind: "down" });
      }
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

function panelLabel(panel: PanelState): string {
  switch (panel.kind) {
    case "ready":
      return "tersambung";
    case "waiting":
      return "menunggu scan";
    case "checking":
      return "mengecek";
    case "down":
      return "sidecar mati";
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
    case "down":
      return <SidecarDownMessage sidecarUrl={sidecarUrl} />;
    case "checking":
      return (
        <p className="text-sm leading-6 text-muted-foreground">
          Mengecek sidecar di laptop ini…
        </p>
      );
    case "waiting":
      return (
        <WaitingQr
          sidecarUrl={sidecarUrl}
          nonce={panel.nonce}
          detail={panel.detail}
        />
      );
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

function WaitingQr({
  sidecarUrl,
  nonce,
  detail,
}: {
  sidecarUrl: string;
  nonce: number;
  detail: string;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      <p className="text-sm leading-6 text-muted-foreground">
        Dari HP FortyFit buka WhatsApp → Setelan → Perangkat tertaut, lalu scan
        kode ini. QR yang sama juga muncul di jendela Chrome yang dibuka sidecar
        di Mac. Tidak perlu membaca terminal.
      </p>
      <div className="flex size-[280px] items-center justify-center rounded-xl bg-white p-3">
        {/* localhost sidecar: next/image cannot load 127.0.0.1 from Vercel admin */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sidecarQrSrc(sidecarUrl, nonce)}
          alt="QR WhatsApp FortyFit"
          width={256}
          height={256}
          className="size-64 object-contain"
        />
      </div>
    </div>
  );
}

function SidecarDownMessage({ sidecarUrl }: { sidecarUrl: string }) {
  return (
    <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
      <p>
        Sidecar WhatsApp belum nyala di laptop ini. Vercel tidak bisa melihat
        QR — yang memuat gambar adalah browser Anda ke {sidecarUrl}.
      </p>
      <p>Di folder repo FortyFit, pada Mac studio, jalankan:</p>
      <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
        {`npm install @open-wa/wa-automate --no-save
npm run openwa`}
      </pre>
      <p>
        Lalu biarkan terminal terbuka dan buka halaman Setting ini lagi di
        browser pada Mac yang sama. Kalau TimeoutError sebelum QR, hapus folder
        _IGNORE_fortyfit di repo lalu jalankan npm run openwa lagi.
      </p>
    </div>
  );
}
