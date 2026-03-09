import { NextRequest, NextResponse } from "next/server";
import { getLedgerRequestById } from "@/lib/db";
import { api404 } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const request = getLedgerRequestById(id);
  if (!request) return api404("Request not found");
  return NextResponse.json(request);
}
