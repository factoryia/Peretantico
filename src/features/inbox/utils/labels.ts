const LABEL_COLORS = [
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
] as const;

export function labelChipClass(name: string, color?: string | null): string {
  if (color) return color;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % LABEL_COLORS.length;
  return `border ${LABEL_COLORS[hash]}`;
}

export const PIPELINE_STAGE_META = {
  visitante: { label: "Sin solicitud", className: "bg-slate-100 text-slate-600" },
  en_proceso: { label: "En proceso", className: "bg-blue-50 text-blue-700" },
  solicitud: { label: "Con solicitud", className: "bg-emerald-50 text-emerald-700" },
} as const;
