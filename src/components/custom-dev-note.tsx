import { demoHref } from "@/lib/site";

/** Aviso debajo del editor: además de las 3 plantillas, se puede pedir una web a medida. */
export function CustomDevNote() {
  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-tinta/10 bg-white px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="text-sm leading-relaxed text-tinta/65">
        <span className="font-semibold text-tinta">¿Querés algo distinto a las 3 plantillas?</span> Nuestro equipo
        puede desarrollar tu web a medida, con un costo adicional.
      </p>
      <a
        href={demoHref}
        className="shrink-0 rounded-full border border-tinta/20 px-4 py-2 text-sm font-medium transition hover:bg-tinta hover:text-white"
      >
        Consultar
      </a>
    </div>
  );
}
