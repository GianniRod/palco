/** Aclaración debajo de cada animación: es una referencia, no el producto final. */
export function RefNote({ className = "" }: { className?: string }) {
  return (
    <p className={`mt-4 text-center text-xs opacity-45 ${className}`}>
      Animación de referencia: el producto final puede variar.
    </p>
  );
}
