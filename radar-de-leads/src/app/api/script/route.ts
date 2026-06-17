import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateScript } from "@/lib/ai";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/script  body: { id }
// Genera el guion para locución y lo guarda. Marca la noticia como
// "guion_generado".
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: news, error } = await db
      .from("news")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;

    const script = await generateScript(news as NewsItem);

    const { data: updated, error: updErr } = await db
      .from("news")
      .update({ script, status: "guion_generado" })
      .eq("id", id)
      .select()
      .single();
    if (updErr) throw updErr;

    return NextResponse.json({ news: updated });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido";
}
