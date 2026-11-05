"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Music, Theater } from "lucide-react";
import { readSegment, saveSegment, segmentPath, type Segment } from "@/lib/segment";

const choices: { id: Segment; title: string; text: string; Icon: typeof Music }[] = [
  {
    id: "boliche",
    title: "Boliche o fiesta",
    text: "Lotes de preventa, RRPP, VIP y mesas.",
    Icon: Music,
  },
  {
    id: "teatro",
    title: "Teatro o sala",
    text: "Funciones, butacas numeradas y plateas.",
    Icon: Theater,
  },
];

/**
 * Pregunta inicial en la home: "¿Sos boliche o teatro?".
 * Se muestra solo la primera vez; después se recuerda la elección.
 */
export function AudienceGate() {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = readSegment();
    if (saved === "teatro") {
      router.replace(segmentPath.teatro);
      return;
    }
    if (saved === null && !ref.current?.open) ref.current?.showModal();
  }, [router]);

  function choose(segment: Segment) {
    saveSegment(segment);
    ref.current?.close();
    if (segment !== "boliche") router.push(segmentPath[segment]);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="gate-title"
      // Cerrar con Escape o tocando afuera equivale a quedarse en la versión boliche.
      onCancel={() => saveSegment("boliche")}
      onClick={(e) => {
        if (e.target === ref.current) choose("boliche");
      }}
      className="m-auto w-[min(560px,92vw)] rounded-2xl border border-black/10 bg-white p-0 text-[#09090b] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm open:[animation:subir_0.35s_ease-out_both]"
    >
      <div className="px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-black/40">Bienvenido a Nightowl</p>
        <h2 id="gate-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          ¿Qué tipo de espacio tenés?
        </h2>
        <p className="mt-2 text-sm text-black/50">Te mostramos Nightowl pensado para vos. Podés cambiarlo arriba cuando quieras.</p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {choices.map(({ id, title, text, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              className="group flex flex-col items-start rounded-xl border border-black/10 p-5 text-left transition hover:border-black/60 hover:bg-black/[0.03] focus-visible:border-black/60 focus-visible:outline-none"
            >
              <Icon className="h-6 w-6 text-black/60 transition group-hover:text-black" />
              <span className="mt-4 text-lg font-semibold">{title}</span>
              <span className="mt-1 text-sm text-black/50">{text}</span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
