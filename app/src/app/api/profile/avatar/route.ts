import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updateUserAvatar } from "@/lib/db";
import { avatarSchema } from "@/lib/validations";
import { api400, api401, api500, safeParseJson } from "@/lib/api-utils";

const MAX_SIZE = 150 * 1024; // 150KB for base64

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = avatarSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { avatar } = parsed.data;

  if (avatar.length > MAX_SIZE) {
    return api400("Image too large (max 150KB)");
  }

  const updated = updateUserAvatar(user.username, avatar);
  if (!updated) return api500("Failed to update");

  return Response.json({ avatarUrl: avatar });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return api401();

  updateUserAvatar(user.username, null);
  return Response.json({ avatarUrl: null });
}
