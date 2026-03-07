import { NextResponse } from "next/server";
import { getAllHangarRequests, getUserHangarRequests } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.roles?.includes("admin")) {
    return NextResponse.json(getAllHangarRequests());
  }
  return NextResponse.json(getUserHangarRequests(user.username));
}
