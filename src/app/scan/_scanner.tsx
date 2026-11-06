"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, ScanLine, X, XCircle } from "lucide-react";
import type QrScannerType from "qr-scanner";
import { scanCodeAction, type ScanResult } from "./actions";

type Phase = { kind: "idle" } | { kind: "scanning" } | { kind: "checking" } | { kind: "done"; scan: ScanResult } | { kind: "error"; message: string };

const time = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

// Vibra distinto según el resultado, para que el portero no tenga que mirar la pantalla.
const VIBRATION: Record<ScanResult["result"], number[]> = {
  valid: [120],
  duplicate: [200, 100, 200],
  invalid: [400],
};

export function Scanner({ light = false, eventId = null }: { light?: boolean; eventId?: string | null }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScannerType | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  // Abre la cámara cuando se pasa a "scanning" y la apaga al salir.
  useEffect(() => {
    if (phase.kind !== "scanning" || !video.current) return;
    let cancelled = false;
    (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !video.current) return;
      const instance = new QrScanner(
        video.current,
        async ({ data }) => {
          instance.stop();
          setPhase({ kind: "checking" });
          try {
            const scan = await scanCodeAction(data, eventId);
            navigator.vibrate?.(VIBRATION[scan.result]);
            setPhase({ kind: "done", scan });
            router.refresh();
          } catch {
            setPhase({ kind: "error", message: "No pudimos validar la entrada. Revisá la conexión y probá de nuevo." });
          }
        },
        { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 8 },
      );
      scanner.current = instance;
      try {
        await instance.start();
      } catch {
        if (!cancelled) {
          setPhase({
            kind: "error",
            message: "No pudimos abrir la cámara. Dale permiso de cámara al navegador para este sitio.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      scanner.current?.destroy();
      scanner.current = null;
    };
  }, [phase.kind, router, eventId]);

  const close = () => setPhase({ kind: "idle" });
  const again = () => setPhase({ kind: "scanning" });

  return (
    <>
      <button
        type="button"
        onClick={again}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl px-6 shadow-lg active:scale-[0.99] ${
          light ? "bg-white py-16 text-black" : "bg-palco-950 py-10 text-white"
        }`}
      >
        <ScanLine className="size-12" strokeWidth={1.5} aria-hidden />
        <span className="text-xl font-semibold">Escanear QR</span>
        <span className={`text-sm ${light ? "text-black/50" : "text-white/60"}`}>Apuntá la cámara a la entrada</span>
      </button>

      {phase.kind !== "idle" && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          {(phase.kind === "scanning" || phase.kind === "checking") && (
            <>
              <video ref={video} className="absolute inset-0 size-full object-cover" playsInline muted />
              <div className="relative flex items-center justify-between p-4">
                <p className="rounded-full bg-black/50 px-3 py-1.5 text-sm">Apuntá al QR de la entrada</p>
                <button type="button" onClick={close} aria-label="Cerrar" className="rounded-full bg-black/50 p-2">
                  <X className="size-6" />
                </button>
              </div>
              {phase.kind === "checking" && (
                <div className="relative m-auto flex flex-col items-center gap-3 rounded-2xl bg-black/70 px-8 py-6">
                  <Loader2 className="size-10 animate-spin" aria-hidden />
                  <p className="font-medium">Validando…</p>
                </div>
              )}
            </>
          )}

          {phase.kind === "done" && <ResultScreen scan={phase.scan} onAgain={again} onClose={close} />}

          {phase.kind === "error" && (
            <div className="m-auto max-w-sm px-6 text-center">
              <AlertTriangle className="mx-auto size-12" aria-hidden />
              <p className="mt-4 text-lg">{phase.message}</p>
              <div className="mt-8 flex flex-col gap-3">
                <button type="button" onClick={again} className="rounded-full bg-white py-3 font-semibold text-black">
                  Probar de nuevo
                </button>
                <button type="button" onClick={close} className="py-3 text-white/70">
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ResultScreen({ scan, onAgain, onClose }: { scan: ScanResult; onAgain: () => void; onClose: () => void }) {
  const look = {
    valid: { bg: "bg-emerald-600", Icon: CheckCircle2, title: "Entrada válida", sub: "Puede pasar" },
    duplicate: { bg: "bg-amber-500", Icon: AlertTriangle, title: "Ya fue usada", sub: "No puede pasar" },
    invalid: { bg: "bg-red-600", Icon: XCircle, title: "Entrada inválida", sub: "No puede pasar" },
  }[scan.result];
  const { Icon } = look;

  return (
    <div className={`flex flex-1 flex-col ${look.bg} p-6`}>
      <div className="m-auto w-full max-w-sm text-center">
        <Icon className="mx-auto size-24" strokeWidth={1.5} aria-hidden />
        <p className="mt-5 text-4xl font-bold tracking-tight">{look.title}</p>
        <p className="mt-1 text-xl text-white/85">{look.sub}</p>

        <div className="mt-8 rounded-2xl bg-black/15 p-4 text-left text-[15px]">
          {scan.result === "invalid" ? (
            <p>{scan.reason}</p>
          ) : (
            <>
              <p className="text-lg font-semibold">
                {scan.label ?? `Prueba ${scan.number}`}
                {scan.holder && ` · ${scan.holder}`}
              </p>
              {scan.result === "valid" && scan.checkedInAt && (
                <p className="mt-1 text-white/85">Ingresó a las {time.format(new Date(scan.checkedInAt))}</p>
              )}
              {scan.result === "duplicate" && (
                <p className="mt-1 text-white/90">
                  Ya había entrado a las{" "}
                  <strong>{scan.checkedInAt ? time.format(new Date(scan.checkedInAt)) : "—"}</strong>
                  {scan.checkedInBy && <> · escaneó {scan.checkedInBy}</>}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3 pb-4">
        <button type="button" onClick={onAgain} className="rounded-full bg-white py-4 text-lg font-semibold text-black">
          Escanear otra
        </button>
        <button type="button" onClick={onClose} className="py-3 text-white/85">
          Listo
        </button>
      </div>
    </div>
  );
}
