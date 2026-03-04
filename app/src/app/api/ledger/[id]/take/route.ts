import { NextRequest, NextResponse } from "next/server";
import { takeLedgerItem } from "@/lib/db";
import { requireLedgerAccess } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireLedgerAccess();
  if (!user) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const { quantity } = await req.json();
  if (!quantity || quantity < 1) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const entry = takeLedgerItem(id, user.username, quantity);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  return NextResponse.json(entry);
}
