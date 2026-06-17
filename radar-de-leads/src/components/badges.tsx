import { NewsStatus, STATUS_LABELS } from "@/lib/types";

const STATUS_STYLES: Record<NewsStatus, string> = {
  nueva: "bg-blue-100 text-blue-800",
  seleccionada: "bg-amber-100 text-amber-800",
  descartada: "bg-slate-200 text-slate-600",
  guion_generado: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: NewsStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  let style = "bg-slate-100 text-slate-700";
  if (score >= 70) style = "bg-emerald-600 text-white";
  else if (score >= 45) style = "bg-amber-500 text-white";
  else style = "bg-slate-300 text-slate-700";

  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${style}`}
      title={`Score editorial: ${score}/100`}
    >
      {score}
    </span>
  );
}
