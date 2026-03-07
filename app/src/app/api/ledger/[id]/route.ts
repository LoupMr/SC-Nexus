import { NextRequest, NextResponse } from "next/server";
import { deleteLedgerEntry, setLedgerEntryShared, getLedgerEntryById } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { api401, api403, api404 } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const entry = getLedgerEntryById(id);
  if (!entry) return api404("Entry not found");
  if (entry.owner !== user.username) return api403("You can only toggle visibility for your own entries");

  const body = await req.json();
  const sharedWithOrg = typeof body?.sharedWithOrg === "boolean" ? body.sharedWithOrg : false;
  const updated = setLedgerEntryShared(id, !!sharedWithOrg);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const entry = getLedgerEntryById(id);
  if (!entry) return api404("Entry not found");

  const admin = await requireAdmin();
  const isOwner = entry.owner === user.username;
  if (!admin && !isOwner) return api403("Admin or entry owner required to delete");

  const deleted = deleteLedgerEntry(id);
  if (!deleted) return api404("Entry not found");
  return NextResponse.json({ ok: true });
}
