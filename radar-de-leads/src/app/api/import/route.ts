import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchFeed } from "@/lib/rss";
import { scoreNews } from "@/lib/scoring";
import type { Source } from "@/lib/types";

export const dynamic = "force-dynamic";
// La importación puede tardar; damos margen en Vercel.
export const maxDuration = 60;

// POST /api/import — importa noticias desde las fuentes RSS activas.
// Calcula score + señales y hace upsert (evita duplicados por url).
//
// Seguridad opcional: si CRON_SECRET está definido, exige el header
// x-cron-secret con ese valor (útil para Vercel Cron).
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      // Acepta header propio o el bearer que envía Vercel Cron automáticamente.
      const ok =
        req.headers.get("x-cron-secret") === secret ||
        req.headers.get("authorization") === `Bearer ${secret}`;
      if (!ok) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    const db = getSupabaseAdmin();

    const { data: sources, error: srcErr } = await db
      .from("sources")
      .select("*")
      .eq("active", true);
    if (srcErr) throw srcErr;

    const results: {
      source: string;
      fetched: number;
      inserted: number;
      error?: string;
    }[] = [];

    let totalInserted = 0;

    for (const source of (sources ?? []) as Source[]) {
      try {
        const entries = await fetchFeed(source.url);
        let inserted = 0;

        for (const entry of entries) {
          const { score, signals } = scoreNews({
            title: entry.title,
            summary: entry.summary,
            publishedAt: entry.publishedAt,
            sourceWeight: source.weight,
            category: source.category,
          });

          // upsert por url: si ya existe no la duplicamos (ignoreDuplicates).
          const { error: insErr, count } = await db
            .from("news")
            .upsert(
              {
                source_id: source.id,
                source_name: source.name,
                title: entry.title,
                url: entry.url,
                published_at: entry.publishedAt,
                category: source.category,
                summary: entry.summary,
                signals,
                score,
                status: "nueva",
              },
              { onConflict: "url", ignoreDuplicates: true, count: "exact" }
            );

          if (insErr) {
            // Un error en un item no debe frenar todo el feed.
            continue;
          }
          if (count && count > 0) inserted += count;
        }

        totalInserted += inserted;
        results.push({
          source: source.name,
          fetched: entries.length,
          inserted,
        });

        await db
          .from("sources")
          .update({ last_fetched_at: new Date().toISOString() })
          .eq("id", source.id);
      } catch (e) {
        results.push({
          source: source.name,
          fetched: 0,
          inserted: 0,
          error: e instanceof Error ? e.message : "Error al leer el feed",
        });
      }
    }

    return NextResponse.json({ ok: true, totalInserted, results });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

// Permitir disparo por GET también (cómodo para Vercel Cron / pruebas).
export async function GET(req: NextRequest) {
  return POST(req);
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido";
}
