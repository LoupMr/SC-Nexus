import { NextRequest } from "next/server";
import { setUserBlueprintUnlocked } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { blueprintUnlockSchema } from "@/lib/validations";
import { api400, api401, safeParseJson } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = blueprintUnlockSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }

  const ok = setUserBlueprintUnlocked(user.id, parsed.data.blueprintId, parsed.data.unlocked);
  if (!ok) return api400("Unknown blueprint id");
  return Response.json({ ok: true });
}
