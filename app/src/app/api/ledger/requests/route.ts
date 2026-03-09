import { NextRequest } from "next/server";
import {
  createLedgerRequest,
  getLedgerRequestsForUser,
  getLedgerRequestsForLogistics,
  getLedgerRequestsForOwner,
  getLedgerEntryById,
} from "@/lib/db";
import { getSessionUser, requireLedgerAccess } from "@/lib/session";
import { ledgerRequestSchema } from "@/lib/validations";
import { api400, api401, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "mine"; // mine | pending_approval | my_handoffs

  if (filter === "pending_approval") {
    const logistics = await requireLedgerAccess();
    if (!logistics) return api403("Logistics role required");
    return Response.json(getLedgerRequestsForLogistics());
  }

  if (filter === "my_handoffs") {
    return Response.json(getLedgerRequestsForOwner(user.username));
  }

  return Response.json(getLedgerRequestsForUser(user.username));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const parsed = ledgerRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid request";
    return api400(msg);
  }

  const data = parsed.data;

  if (data.type === "add_to_org") {
    const logistics = await requireLedgerAccess();
    if (logistics) {
      return api400("Use POST /api/ledger with sharedWithOrg=true to add directly");
    }
    const request = createLedgerRequest(
      "add_to_org",
      user.username,
      data.items.map((i) => ({
        itemName: i.itemName,
        subcategory: i.subcategory,
        quantity: i.quantity,
        location: i.location,
      }))
    );
    return Response.json(request, { status: 201 });
  }

  if (data.type === "take_from_org") {
    for (const it of data.items) {
      const entry = getLedgerEntryById(it.ledgerEntryId);
      if (!entry) return api404(`Entry ${it.ledgerEntryId} not found`);
      if (!entry.sharedWithOrg) return api400("Can only request from shared org entries");
      if (entry.quantity < it.quantity) return api400(`Insufficient quantity for ${entry.itemName}`);
    }
    const request = createLedgerRequest(
      "take_from_org",
      user.username,
      data.items.map((i) => ({ ledgerEntryId: i.ledgerEntryId, quantity: i.quantity })),
      data.description?.trim() || null
    );
    return Response.json(request, { status: 201 });
  }

  return api400("Invalid request type");
}
