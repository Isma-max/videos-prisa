"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/types";
import { StatusBadge, ScoreBadge } from "./badges";

interface Props {
  news: NewsItem;
  busy: "lead" | "script" | null;
  onClose: () => void;
  onGenerateLead: () => void;
  onGenerateScript: () => void;
}

export function NewsDetailModal({
  news,
  busy,
  onClose,
  onGenerateLead,
  onGenerateScript,
}: Props) {
  const [copied, setCopied] = useState<"lead" | "script" | null>(null);

  function copy(text: string, which: "lead" | "script") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const leadText = news.lead
    ? [
        `GANCHO: ${news.lead.gancho}`,
        `ÁNGULO: ${news.lead.angulo}`,
        `POR QUÉ FUNCIONA: ${news.lead.porQueFunciona}`,
        `FORMATO: ${news.lead.formato}`,
        `ADVERTENCIAS: ${news.lead.advertencias}`,
      ].join("\n\n")
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <ScoreBadge score={news.score} />
            <div>
              <h2 className="text-base font-semibold leading-snug">
                {news.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{news.source_name}</span>
                {news.category && <span>· {news.category}</span>}
                {news.published_at && (
                  <span>· {formatDate(news.published_at)}</span>
                )}
                <StatusBadge status={news.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Resumen + señales */}
          <section>
            {news.summary && (
              <p className="text-sm text-slate-700">{news.summary}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {news.signals.map((s) => (
                <span
                  key={s}
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {s}
                </span>
              ))}
            </div>
            <a
              href={news.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              Abrir noticia original ↗
            </a>
          </section>

          {/* Acciones */}
          <section className="flex flex-wrap gap-2">
            <button
              onClick={onGenerateLead}
              disabled={busy !== null}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy === "lead"
                ? "Generando lead…"
                : news.lead
                ? "Regenerar lead"
                : "Generar lead"}
            </button>
            <button
              onClick={onGenerateScript}
              disabled={busy !== null}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === "script"
                ? "Generando guion…"
                : news.script
                ? "Regenerar guion"
                : "Generar guion"}
            </button>
          </section>

          {/* Lead */}
          {news.lead && (
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Lead</h3>
                <button
                  onClick={() => copy(leadText, "lead")}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  {copied === "lead" ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <dl className="space-y-2 text-sm">
                <Field label="Gancho" value={news.lead.gancho} />
                <Field label="Ángulo" value={news.lead.angulo} />
                <Field
                  label="Por qué funciona"
                  value={news.lead.porQueFunciona}
                />
                <Field label="Formato" value={news.lead.formato} />
                <Field
                  label="Advertencias"
                  value={news.lead.advertencias}
                  warn
                />
              </dl>
            </section>
          )}

          {/* Guion */}
          {news.script && (
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Guion (locución)</h3>
                <button
                  onClick={() => copy(news.script!, "script")}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  {copied === "script" ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {news.script}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className={warn ? "text-amber-800" : "text-slate-700"}>{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
