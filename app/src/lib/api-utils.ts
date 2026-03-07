import { NextResponse } from "next/server";

export interface ApiError {
  error: string;
  code?: string;
}

export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code } as ApiError, { status });
}

export function api400(message: string) {
  return apiError(message, 400, "BAD_REQUEST");
}

export function api401(message = "Unauthorized") {
  return apiError(message, 401, "UNAUTHORIZED");
}

export function api403(message = "Forbidden") {
  return apiError(message, 403, "FORBIDDEN");
}

export function api404(message = "Not found") {
  return apiError(message, 404, "NOT_FOUND");
}

export function api409(message: string) {
  return apiError(message, 409, "CONFLICT");
}
