import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NEWS_STATUSES, NewsStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/news?status=&category=&q=&order=
// Lista noticias con filtros opcionales. Por defecto ordena por score desc.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const order = searchParams.get("order") ?? "score";

    const db = getSupabaseAdmin();
    let query = db.from("news").select("*");

    if (status && NEWS_STATUSES.includes(status as NewsStatus)) {
      query = query.eq("status", status);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    if (order === "recent") {
      query = query.order("published_at", { ascending: false, nullsFirst: false });
    } else {
      query = query
        .order("score", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false });
    }

    query = query.limit(300);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ news: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido";
}
