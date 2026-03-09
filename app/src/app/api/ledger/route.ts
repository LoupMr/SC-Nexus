import { NextRequest, NextResponse } from "next/server";
import { getLedgerEntriesForView, addLedgerEntry, getAvatarUrls } from "@/lib/db";
import { getSessionUser, requireLedgerAccess } from "@/lib/session";
import { ledgerAddSchema } from "@/lib/validations";
import { api400, api401, safeParseJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { searchParams } = new URL(req.url);
  const view = (searchParams.get("view") || "org") as "org" | "mine";
  if (view !== "org" && view !== "mine") return api400("Invalid view");

  const entries = getLedgerEntriesForView(view, user.username);
  const avatars = getAvatarUrls(entries.map((e) => e.owner));
  const withAvatars = entries.map((e) => ({ ...e, ownerAvatarUrl: avatars[e.owner] ?? null }));
  return Response.json(withAvatars);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = ledgerAddSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { itemName, subcategory, quantity, location, sharedWithOrg } = parsed.data;

  if (sharedWithOrg) {
    const logistics = await requireLedgerAccess();
    if (!logistics) return api401("Use the request flow to add to org ledger (logistics approval required)");
  }

  const entry = addLedgerEntry(
    itemName,
    subcategory,
    user.username,
    quantity,
    location,
    sharedWithOrg
  );
  return NextResponse.json(entry, { status: 201 });
}
