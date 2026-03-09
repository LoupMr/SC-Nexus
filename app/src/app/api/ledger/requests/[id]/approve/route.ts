import { NextRequest, NextResponse } from "next/server";
import { approveLedgerRequest } from "@/lib/db";
import { requireLedgerAccess } from "@/lib/session";
import { api401, api404 } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireLedgerAccess();
  if (!user) return api401("Logistics role required");

  const { id } = await params;
  const request = approveLedgerRequest(id, user.username);
  if (!request) return api404("Request not found or not pending");
  return NextResponse.json(request);
}
