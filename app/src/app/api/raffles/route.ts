import { NextRequest } from "next/server";
import { createRaffle, getAllRafflesWithParticipants } from "@/lib/db";
import { getSessionUser, requireRaffleAccess } from "@/lib/session";
import { raffleCreateSchema } from "@/lib/validations";
import { api400, api401, api403, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  return Response.json(getAllRafflesWithParticipants());
}

export async function POST(req: NextRequest) {
  const raffleUser = await requireRaffleAccess();
  if (!raffleUser) return api403("Raffle access required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = raffleCreateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { meritTag, assetId, assetIds } = parsed.data;
  const ids = Array.isArray(assetIds) && assetIds.length > 0 ? assetIds : (assetId ? [assetId] : []);

  const raffle = createRaffle(meritTag, ids);
  return Response.json(raffle, { status: 201 });
}
