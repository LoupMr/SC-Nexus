import { NextRequest, NextResponse } from "next/server";
import { getNotifications, getUnreadNotificationCount } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { api401 } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const countOnly = searchParams.get("count") === "1";

  if (countOnly) {
    const count = getUnreadNotificationCount(user.username);
    return NextResponse.json({ count });
  }

  const notifications = getNotifications(user.username, unreadOnly);
  return NextResponse.json(notifications);
}
