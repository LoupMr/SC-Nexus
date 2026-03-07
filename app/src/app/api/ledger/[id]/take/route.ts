import { NextRequest, NextResponse } from "next/server";
import { takeLedgerItem, getLedgerEntryById } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ledgerTakeSchema } from "@/lib/validations";
import { api400, api401, api403, api404 } from "@/lib/api-utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const existing = getLedgerEntryById(id);
  if (!existing) return api404("Entry not found");

  const canTake =
    existing.owner === user.username ||
    (existing.sharedWithOrg && (user.roles?.includes("admin") || user.roles?.includes("logistics")));
  if (!canTake) return api403("You can only take from your own entries or shared org entries (logistics)");

  const parsed = ledgerTakeSchema.safeParse(await req.json());
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid quantity";
    return api400(msg);
  }
  const { quantity } = parsed.data;

  const entry = takeLedgerItem(id, user.username, quantity);
  if (!entry) return api404("Entry not found");
  return NextResponse.json(entry);
}
