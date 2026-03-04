import { NextRequest, NextResponse } from "next/server";
import { deleteLedgerEntry } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await params;
  const deleted = deleteLedgerEntry(id);
  if (!deleted) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
