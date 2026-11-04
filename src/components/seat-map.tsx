// Ilustración decorativa de una sala con butacas numeradas.
// El patrón es determinístico para que el render del servidor y del cliente coincidan.

const ROWS = ["A", "B", "C", "D", "E", "F", "G"];
const SEATS_PER_ROW = 14;
const AISLE_AFTER = 7;

type SeatState = "libre" | "vendida" | "elegida";

function seatState(row: number, seat: number): SeatState {
  if (row === 3 && (seat === 6 || seat === 7)) return "elegida";
  const n = (row * 31 + seat * 17 + row * seat) % 10;
  if (row < 2) return n < 8 ? "vendida" : "libre";
  return n < 5 ? "vendida" : "libre";
}

const stateClass: Record<SeatState, string> = {
  libre: "bg-white/15 ring-1 ring-inset ring-white/25",
  vendida: "bg-white/5",
  elegida: "bg-dorado shadow-[0_0_16px_rgba(217,178,111,0.6)]",
};

export function SeatMap() {
  return (
    <div
      aria-hidden="true"
      className="relative rounded-3xl border border-white/10 bg-palco-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8"
    >
      <div className="mx-auto mb-8 h-2 w-3/4 rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <p className="-mt-6 mb-6 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">
        Escenario
      </p>

      <div className="flex flex-col gap-2">
        {ROWS.map((label, r) => (
          <div key={label} className="flex items-center justify-center gap-1.5">
            <span className="w-4 text-[10px] text-white/40">{label}</span>
            {Array.from({ length: SEATS_PER_ROW }, (_, s) => (
              <span
                key={s}
                className={`h-3.5 w-3.5 rounded-t-md rounded-b-sm sm:h-4 sm:w-4 ${stateClass[seatState(r, s)]} ${
                  s === AISLE_AFTER - 1 ? "mr-3" : ""
                }`}
              />
            ))}
            <span className="w-4 text-right text-[10px] text-white/40">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white">
        <div>
          <p className="text-xs text-white/50">Fila D · Butacas 7 y 8</p>
          <p className="font-display font-medium">2 entradas · Platea</p>
        </div>
        <span className="rounded-full bg-dorado px-4 py-1.5 text-xs font-semibold text-palco-950">
          Comprar
        </span>
      </div>

      <div className="mt-4 flex justify-center gap-5 text-[11px] text-white/50">
        <Legend className={stateClass.libre} label="Libre" />
        <Legend className={stateClass.vendida} label="Vendida" />
        <Legend className={stateClass.elegida} label="Tu elección" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
