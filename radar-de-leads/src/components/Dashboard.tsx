"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewsItem, NewsStatus } from "@/lib/types";
import { NEWS_STATUSES, STATUS_LABELS } from "@/lib/types";
import { StatusBadge, ScoreBadge } from "./badges";
import { NewsDetailModal } from "./NewsDetailModal";

export default function Dashboard() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // filtros
  const [statusFilter, setStatusFilter] = useState<NewsStatus | "">("");
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<"score" | "recent">("score");

  // modal
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [busy, setBusy] = useState<"lead" | "script" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (q) params.set("q", q);
      params.set("order", order);
      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar noticias");
      setNews(data.news);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q, order]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function runImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar");
      flash(`Importación lista: ${data.totalInserted} noticias nuevas.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  async function updateStatus(item: NewsItem, status: NewsStatus) {
    try {
      const res = await fetch(`/api/news/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      replaceItem(data.news);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al actualizar");
    }
  }

  function replaceItem(updated: NewsItem) {
    setNews((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSelected((cur) => (cur && cur.id === updated.id ? updated : cur));
  }

  async function generate(kind: "lead" | "script", item: NewsItem) {
    setBusy(kind);
    try {
      const res = await fetch(`/api/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");
      replaceItem(data.news);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al generar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Barra de acciones */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Noticias detectadas</h1>
          <p className="text-sm text-slate-500">
            {news.length} resultado{news.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={runImport}
          disabled={importing}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {importing ? "Importando…" : "↻ Importar desde RSS"}
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en títulos…"
          className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as NewsStatus | "")}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {NEWS_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as "score" | "recent")}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="score">Ordenar por score</option>
          <option value="recent">Ordenar por fecha</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Fuente</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : news.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  No hay noticias. Pulsa “Importar desde RSS” para empezar.
                </td>
              </tr>
            ) : (
              news.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <ScoreBadge score={item.score} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setSelected(item)}
                      className="text-left font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {item.title}
                    </button>
                    {item.signals.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.signals.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {item.source_name}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {item.category ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {item.published_at ? formatDate(item.published_at) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelected(item)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        Ver
                      </button>
                      {item.status !== "seleccionada" && (
                        <button
                          onClick={() => updateStatus(item, "seleccionada")}
                          className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                        >
                          Seleccionar
                        </button>
                      )}
                      {item.status !== "descartada" && (
                        <button
                          onClick={() => updateStatus(item, "descartada")}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          Descartar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <NewsDetailModal
          news={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onGenerateLead={() => generate("lead", selected)}
          onGenerateScript={() => generate("script", selected)}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
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
