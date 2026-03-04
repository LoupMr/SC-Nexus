import { NextRequest, NextResponse } from "next/server";
import { getAllOperations, createOperation } from "@/lib/db";
import { getSessionUser, requireOpsAccess } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllOperations());
}

export async function POST(req: NextRequest) {
  const user = await requireOpsAccess();
  if (!user) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { title, description, status, priority, steps } = await req.json();
  if (!title || !description) {
    return NextResponse.json({ error: "Title and description required" }, { status: 400 });
  }

  const op = createOperation(title, description, status || "active", priority || "medium", steps || []);
  return NextResponse.json(op, { status: 201 });
}
