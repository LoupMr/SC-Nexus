import { NextRequest, NextResponse } from "next/server";
import { deleteHangarAsset, updateHangarAsset } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await params;
  const { name, description, shipClass, requirementTag, categoryId, requirementCount } = await req.json();
  if (!name || !requirementTag) {
    return NextResponse.json({ error: "Name and requirementTag required" }, { status: 400 });
  }

  const updated = updateHangarAsset(id, name, description || "", shipClass || "", requirementTag, categoryId, requirementCount);
  if (!updated) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await params;
  const deleted = deleteHangarAsset(id);
  if (!deleted) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
