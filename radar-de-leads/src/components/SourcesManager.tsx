"use client";

import { useEffect, useState } from "react";
import type { Source } from "@/lib/types";

export default function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // formulario nueva fuente
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [weight, setWeight] = useState(50);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar fuentes");
      setSources(data.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, category, weight }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear fuente");
      setName("");
      setUrl("");
      setCategory("");
      setWeight(50);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Source) {
    await patch(s.id, { active: !s.active });
  }

  async function changeWeight(s: Source, value: number) {
    await patch(s.id, { weight: value });
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setSources((prev) => prev.map((s) => (s.id === id ? data.source : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta fuente?")) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Fuentes RSS</h1>
      <p className="mb-5 text-sm text-slate-500">
        Administra los feeds desde donde se importan las noticias.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form nueva fuente */}
      <form
        onSubmit={addSource}
        className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej: BioBioChile)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-3"
        />
        <input
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL del feed RSS/Atom"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-5"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoría"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => setWeight(parseInt(e.target.value || "0", 10))}
          title="Peso editorial (0-100)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 sm:col-span-1"
        >
          {saving ? "…" : "Añadir"}
        </button>
      </form>

      {/* Tabla de fuentes */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Fuente</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Peso</th>
              <th className="px-3 py-2">Activa</th>
              <th className="px-3 py-2">Última lectura</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : sources.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  No hay fuentes. Añade una arriba.
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {s.name}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-slate-500">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {s.url}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {s.category ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={s.weight}
                      onBlur={(e) =>
                        changeWeight(s, parseInt(e.target.value || "0", 10))
                      }
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {s.active ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {s.last_fetched_at
                      ? new Date(s.last_fetched_at).toLocaleString("es-CL")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
