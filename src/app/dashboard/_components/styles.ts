// Clases compartidas: acá y no en ui.tsx para poder usarlas también desde el servidor.
export const inputClass =
  "w-full rounded-lg border border-palco-200 bg-white px-3 py-2 text-sm text-tinta outline-none transition placeholder:text-palco-300 focus:border-palco-500 focus:ring-2 focus:ring-palco-200";

const buttonStyles = {
  primary: "bg-palco-800 text-white hover:bg-palco-700",
  secondary: "border border-palco-200 bg-white text-palco-800 hover:bg-palco-50",
  danger: "border border-palco-200 bg-white text-palco-600 hover:bg-palco-50",
};

export type ButtonVariant = keyof typeof buttonStyles;

export function buttonClass(variant: ButtonVariant = "primary") {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${buttonStyles[variant]}`;
}
