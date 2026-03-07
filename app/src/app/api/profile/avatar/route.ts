import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updateUserAvatar } from "@/lib/db";

const MAX_SIZE = 150 * 1024; // 150KB for base64

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { avatar } = body as { avatar?: string };

  if (!avatar || typeof avatar !== "string") {
    return NextResponse.json({ error: "Avatar data required" }, { status: 400 });
  }

  if (!avatar.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
  }

  if (avatar.length > MAX_SIZE) {
    return NextResponse.json({ error: "Image too large (max 150KB)" }, { status: 400 });
  }

  const updated = updateUserAvatar(user.username, avatar);
  if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({ avatarUrl: avatar });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  updateUserAvatar(user.username, null);
  return NextResponse.json({ avatarUrl: null });
}
