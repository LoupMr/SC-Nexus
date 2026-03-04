import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json(null);
  return NextResponse.json({ username: user.username, role: user.role });
}
