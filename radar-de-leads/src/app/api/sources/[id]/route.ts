import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// PATCH /api/sources/:id — actualiza una fuente (ej: activar/desactivar, peso)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (typeof body.active === "boolean") update.active = body.active;
    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.category === "string")
      update.category = body.category.trim() || null;
    if (body.weight !== undefined) {
      const n = parseInt(String(body.weight), 10);
      if (!isNaN(n)) update.weight = Math.max(0, Math.min(100, n));
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("sources")
      .update(update)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ source: data });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

// DELETE /api/sources/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from("sources").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido";
}
