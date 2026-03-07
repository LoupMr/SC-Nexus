import { NextRequest, NextResponse } from "next/server";
import { updateRaffle, deleteRaffle } from "@/lib/db";
import { requireRaffleAccess } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const raffleUser = await requireRaffleAccess();
  if (!raffleUser) return NextResponse.json({ error: "Raffle access required" }, { status: 403 });

  const { id } = await params;
  const { meritTag, assetId, assetIds } = await req.json();
  const ids = Array.isArray(assetIds) && assetIds.length > 0 ? assetIds : (assetId ? [assetId] : undefined);
  const updated = updateRaffle(id, meritTag, ids);
  if (!updated) return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const raffleUser = await requireRaffleAccess();
  if (!raffleUser) return NextResponse.json({ error: "Raffle access required" }, { status: 403 });

  const { id } = await params;
  const deleted = deleteRaffle(id);
  if (!deleted) return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
