import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updateUserBackground } from "@/lib/db";
import { backgroundSchema } from "@/lib/validations";
import { api400, api401, api500, safeParseJson } from "@/lib/api-utils";

const MAX_SIZE = 1500 * 1024; // 1.5MB for base64 (external URLs not limited)

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = backgroundSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { background } = parsed.data;

  if (background.startsWith("data:") && background.length > MAX_SIZE) {
    return api400("Image too large (max ~1.5MB)");
  }

  const updated = updateUserBackground(user.username, background);
  if (!updated) return api500("Failed to update");

  return Response.json({ backgroundUrl: background });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return api401();

  updateUserBackground(user.username, null);
  return Response.json({ backgroundUrl: null });
}
