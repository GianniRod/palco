"use client";

import { useId, useState } from "react";
import { Logo } from "@/components/logo";

/**
 * Calculadora de comisiones: compara cuánto recibe el organizador (o cuánto paga el
 * público) con Nightowl y con otras ticketeras.
 *
 * Los porcentajes de la competencia son de referencia (cargo de servicio habitual);
 * pueden variar según el acuerdo de cada productor. Hay una aclaración debajo.
 */
const platforms = [
  { name: "Nightowl", fee: 0.08, ours: true },
  { name: "Passline", fee: 0.15, ours: false },
  { name: "Passify", fee: 0.15, ours: false },
];

type Payer = "publico" | "organizador" | "ambos";

const money = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function FeeCalculator() {
  const [price, setPrice] = useState(15000);
  const [qty, setQty] = useState(500);
  const [payer, setPayer] = useState<Payer>("publico");
  const [publicShare, setPublicShare] = useState(50); // % de la comisión que paga el público en "Ambos"
  const priceId = useId();
  const qtyId = useId();
  const splitId = useId();

  // Parte de la comisión que paga el público (0 a 1); el resto lo absorbe el organizador.
  const share = payer === "publico" ? 1 : payer === "organizador" ? 0 : publicShare / 100;
  const gross = price * qty;
  const rows = platforms
    .map((p) => {
      const feeTotal = Math.round(gross * p.fee);
      return {
        ...p,
        feeTotal,
        youGet: Math.round(gross - feeTotal * (1 - share)),
        buyerPays: Math.round(price * (1 + p.fee * share)),
      };
    })
    .sort((a, b) => a.fee - b.fee);
  const cheapest = rows[0];
  const ours = rows.find((r) => r.ours)!;

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      {/* Datos */}
      <div className="rounded-2xl border border-tinta/10 bg-white p-6">
        <label htmlFor={priceId} className="text-xs uppercase tracking-[0.2em] text-tinta/45">
          Precio de la entrada
        </label>
        <div className="mt-2 flex h-12 items-center rounded-xl border border-tinta/15 px-4 focus-within:border-tinta">
          <span className="mr-1 text-tinta/40">$</span>
          <input
            id={priceId}
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={price || ""}
            onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
            className="w-full bg-transparent text-lg tabular-nums outline-none"
          />
        </div>

        <label htmlFor={qtyId} className="mt-6 block text-xs uppercase tracking-[0.2em] text-tinta/45">
          Entradas vendidas
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id={qtyId}
            type="range"
            min={50}
            max={5000}
            step={50}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-full accent-[var(--color-tinta)]"
          />
          <span className="w-16 text-right text-lg tabular-nums">{qty.toLocaleString("es-AR")}</span>
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-tinta/45">La comisión la paga</p>
        <div className="mt-2 grid grid-cols-3 rounded-full border border-tinta/15 p-0.5 text-sm font-medium">
          {(
            [
              ["publico", "Tu público"],
              ["organizador", "Vos"],
              ["ambos", "Ambos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPayer(id)}
              aria-pressed={payer === id}
              className={`rounded-full py-2 transition ${
                payer === id ? "bg-tinta text-white" : "text-tinta/55 hover:text-tinta"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {payer === "ambos" && (
          <div className="mt-4">
            <input
              id={splitId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={publicShare}
              onChange={(e) => setPublicShare(Number(e.target.value))}
              aria-label="Parte de la comisión que paga tu público"
              className="w-full accent-[var(--color-tinta)]"
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-tinta/55">
              <span>Tu público {publicShare}%</span>
              <span>Vos {100 - publicShare}%</span>
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-tinta/10 pt-4 text-sm text-tinta/55">
          Venta total: <span className="font-semibold tabular-nums text-tinta">{money(gross)}</span>
        </p>
      </div>

      {/* Comparación */}
      <div className="space-y-3">
        {rows.map((r) => {
          const isCheapest = r.name === cheapest.name;
          const lessForYou = ours.youGet - r.youGet;
          const moreForBuyer = r.buyerPays - ours.buyerPays;
          return (
            <div
              key={r.name}
              className={`relative flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between ${
                r.ours ? "bg-palco-900 text-white" : "border border-tinta/10 bg-white"
              }`}
            >
              <div>
                <div className="flex items-center gap-3">
                  {r.ours ? (
                    <Logo className="h-6" color="#ffffff" />
                  ) : (
                    <p className="text-xl font-semibold tracking-tight">{r.name}</p>
                  )}
                  {isCheapest && (
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-palco-950">
                      La más barata
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${r.ours ? "text-white/55" : "text-tinta/50"}`}>
                  Comisión del {Math.round(r.fee * 100)}%
                </p>
              </div>

              <div className="text-left sm:text-right">
                {/* Si paga el público, lo que recibe el boliche es igual en todas: se muestra el precio final de la entrada */}
                {payer === "publico" ? (
                  <>
                    <p className={`text-xs ${r.ours ? "text-white/55" : "text-tinta/50"}`}>Tu público paga por entrada</p>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight">{money(r.buyerPays)}</p>
                  </>
                ) : (
                  <>
                    <p className={`text-xs ${r.ours ? "text-white/55" : "text-tinta/50"}`}>Vos recibís</p>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight">{money(r.youGet)}</p>
                    {payer === "ambos" && (
                      <p className={`mt-1 text-sm ${r.ours ? "text-white/55" : "text-tinta/50"}`}>
                        Tu público paga {money(r.buyerPays)} por entrada
                      </p>
                    )}
                  </>
                )}
                {!r.ours && (lessForYou > 0 || moreForBuyer > 0) && (
                  <p className="mt-1 text-sm font-medium text-tinta/75">
                    {[
                      lessForYou > 0 && `${money(lessForYou)} menos para vos`,
                      moreForBuyer > 0 && `${money(moreForBuyer)} más caro por entrada`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    que con Nightowl
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <p className="pt-2 text-xs leading-relaxed text-tinta/40">
          Comparación de la comisión de plataforma. Para Passline y Passify se toma un cargo de servicio de
          referencia del 15%; el valor real puede variar según el acuerdo de cada productor. No incluye
          los costos del medio de pago.
        </p>
      </div>
    </div>
  );
}
