import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NEWS_STATUSES, NewsStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// PATCH /api/news/:id — cambia el estado (nueva/seleccionada/descartada/guion_generado)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!NEWS_STATUSES.includes(body.status as NewsStatus)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }
      update.status = body.status;
    }
    if (typeof body.category === "string") {
      update.category = body.category.trim() || null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("news")
      .update(update)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ news: data });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

// DELETE /api/news/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from("news").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido";
}
