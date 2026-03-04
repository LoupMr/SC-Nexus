import { NextRequest, NextResponse } from "next/server";
import { getAllLedgerEntries, addLedgerEntry } from "@/lib/db";
import { getSessionUser, requireLedgerAccess } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllLedgerEntries());
}

export async function POST(req: NextRequest) {
  const user = await requireLedgerAccess();
  if (!user) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { itemName, subcategory, quantity, location } = await req.json();
  if (!itemName || !subcategory || !location || !quantity) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const entry = addLedgerEntry(itemName, subcategory, user.username, Math.max(1, quantity), location);
  return NextResponse.json(entry, { status: 201 });
}
