import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { api401 } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return NextResponse.json({ ok: false }, { status: 400 });

  markNotificationRead(numId);
  return NextResponse.json({ ok: true });
}
