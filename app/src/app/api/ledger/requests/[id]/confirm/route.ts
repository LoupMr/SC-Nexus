import { NextRequest, NextResponse } from "next/server";
import { confirmLedgerRequestHandoff } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { api401, api404 } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const request = confirmLedgerRequestHandoff(id, user.username);
  if (!request) return api404("Request not found or you are not the owner of any items in this request");
  return NextResponse.json(request);
}
