import { NextRequest } from "next/server";
import { deleteLedgerEntry, setLedgerEntryShared, getLedgerEntryById } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { ledgerPatchSchema } from "@/lib/validations";
import { api400, api401, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const entry = getLedgerEntryById(id);
  if (!entry) return api404("Entry not found");
  if (entry.owner !== user.username) return api403("You can only toggle visibility for your own entries");
  if (entry.sharedWithOrg) return api403("Cannot modify shared entries once shared to org");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = ledgerPatchSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const updated = setLedgerEntryShared(id, parsed.data.sharedWithOrg);
  return Response.json(updated);
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
  if (isOwner && entry.sharedWithOrg) return api403("Cannot delete shared entries once shared to org");

  const deleted = deleteLedgerEntry(id);
  if (!deleted) return api404("Entry not found");
  return Response.json({ ok: true });
}
