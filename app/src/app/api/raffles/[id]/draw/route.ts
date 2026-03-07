import { NextRequest, NextResponse } from "next/server";
import { drawRaffleWinner, logAudit } from "@/lib/db";
import { requireRaffleAccess } from "@/lib/session";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const raffleUser = await requireRaffleAccess();
  if (!raffleUser) return NextResponse.json({ error: "Raffle access required" }, { status: 403 });

  const { id } = await params;
  const result = drawRaffleWinner(id);
  if (!result) return NextResponse.json({ error: "Raffle not found, already closed, or no eligible members" }, { status: 400 });
  logAudit("raffle_draw", raffleUser.username, "raffle", id, JSON.stringify(result));
  return NextResponse.json(result);
}
