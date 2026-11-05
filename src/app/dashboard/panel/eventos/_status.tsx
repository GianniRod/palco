const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-palco-100 text-palco-800" },
  published: { label: "Publicado", className: "bg-emerald-100 text-emerald-900" },
  finished: { label: "Finalizado", className: "bg-palco-100 text-palco-600" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-900" },
};

export function StatusPill({ status }: { status: string }) {
  const { label, className } = STATUS[status] ?? STATUS.draft;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
