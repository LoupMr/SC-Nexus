import { NextRequest, NextResponse } from "next/server";
import { deleteHangarSelectionByUser } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assetId } = await params;
  const deleted = deleteHangarSelectionByUser(assetId, user.username);
  if (!deleted) return NextResponse.json({ error: "Selection not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
