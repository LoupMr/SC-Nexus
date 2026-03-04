import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const members = getAllUsers();
  return NextResponse.json({ count: members.length });
}
