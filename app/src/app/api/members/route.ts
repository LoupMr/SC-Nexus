import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  return NextResponse.json(getAllUsers());
}
