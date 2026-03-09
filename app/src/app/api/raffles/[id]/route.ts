import { NextRequest } from "next/server";
import { updateRaffle, deleteRaffle } from "@/lib/db";
import { requireRaffleAccess } from "@/lib/session";
import { raffleUpdateSchema } from "@/lib/validations";
import { api400, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const raffleUser = await requireRaffleAccess();
  if (!raffleUser) return api403("Raffle access required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = raffleUpdateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { id } = await params;
  const { meritTag, assetId, assetIds } = parsed.data;
  const ids = Array.isArray(assetIds) && assetIds.length > 0 ? assetIds : (assetId ? [assetId] : undefined);
  const updated = updateRaffle(id, meritTag, ids);
  if (!updated) return api404("Raffle not found");
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const raffleUser = await requireRaffleAccess();
  if (!raffleUser) return api403("Raffle access required");

  const { id } = await params;
  const deleted = deleteRaffle(id);
  if (!deleted) return api404("Raffle not found");
  return Response.json({ ok: true });
}
