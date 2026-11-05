/**
 * Búho que se asoma por detrás del texto de un botón, de derecha a izquierda,
 * cuando el cursor pasa por encima (solo en dispositivos con hover).
 *
 * Uso: el botón (o un contenedor que lo envuelva) lleva la clase `asoma`, y el
 * elemento que recorta (el propio botón o el talón) lleva `relative overflow-hidden`
 * o una máscara. El texto del botón tiene que ir en un elemento `relative z-10`.
 * La animación está en globals.css (.buho-asoma).
 */
export function OwlPeek({ className }: { className: string }) {
  return <span aria-hidden className={`buho-asoma pointer-events-none absolute block ${className}`} />;
}
