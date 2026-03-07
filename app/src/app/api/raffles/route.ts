import { NextRequest, NextResponse } from "next/server";
import { createRaffle, getAllRafflesWithParticipants } from "@/lib/db";
import { getSessionUser, requireRaffleAccess } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllRafflesWithParticipants());
}

export async function POST(req: NextRequest) {
  const raffleUser = await requireRaffleAccess();
  if (!raffleUser) return NextResponse.json({ error: "Raffle access required" }, { status: 403 });

  const { meritTag, assetId, assetIds } = await req.json();
  const ids = Array.isArray(assetIds) && assetIds.length > 0 ? assetIds : (assetId ? [assetId] : []);
  if (!meritTag || ids.length === 0) {
    return NextResponse.json({ error: "meritTag and at least one prize (assetId or assetIds) required" }, { status: 400 });
  }

  const raffle = createRaffle(meritTag, ids);
  return NextResponse.json(raffle, { status: 201 });
}
