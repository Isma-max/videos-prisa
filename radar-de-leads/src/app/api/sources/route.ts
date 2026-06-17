import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/sources — lista todas las fuentes
export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("sources")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ sources: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

// POST /api/sources — crea una fuente
// body: { name, url, category?, weight?, active? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name ?? "").trim();
    const url = (body.url ?? "").trim();
    if (!name || !url) {
      return NextResponse.json(
        { error: "name y url son obligatorios" },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("sources")
      .insert({
        name,
        url,
        category: body.category?.trim() || null,
        weight: clampWeight(body.weight),
        active: body.active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ source: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function clampWeight(w: unknown): number {
  const n = typeof w === "number" ? w : parseInt(String(w ?? 50), 10);
  if (isNaN(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido";
}
