import { NextRequest } from "next/server";
import { getUserHangarSelections, createHangarSelection } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { hangarSelectionSchema } from "@/lib/validations";
import { api400, api401, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  return Response.json(getUserHangarSelections(user.username));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = hangarSelectionSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { assetId } = parsed.data;

  const result = createHangarSelection(user.username, assetId);
  if (!result.ok) return api400(result.error);
  return Response.json(result.selection, { status: 201 });
}
