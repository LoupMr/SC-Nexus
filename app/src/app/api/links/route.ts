import { NextRequest, NextResponse } from "next/server";
import { getAllLinks, createLink } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllLinks());
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { title, description, url } = await req.json();
  if (!title || !url) {
    return NextResponse.json({ error: "Title and URL required" }, { status: 400 });
  }

  const link = createLink(title, description || "", url);
  return NextResponse.json(link, { status: 201 });
}
