import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, createUser, simpleHash, createSession, getPasskey } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { username, password, passkey } = await req.json();
  if (!username || !password || !passkey) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (username.length < 3) return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });

  const currentPasskey = getPasskey();
  if (passkey !== currentPasskey) {
    return NextResponse.json({ error: "Invalid passkey" }, { status: 403 });
  }

  if (findUserByUsername(username)) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const user = createUser(username, simpleHash(password), "viewer");
  const token = createSession(user.id);
  const res = NextResponse.json({ username: user.username, role: user.role });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
