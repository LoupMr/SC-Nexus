import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, simpleHash, createSession } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const user = findUserByUsername(username);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
  if (user.password_hash !== simpleHash(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

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
