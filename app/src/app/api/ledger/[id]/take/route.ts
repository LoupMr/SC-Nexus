import { api403 } from "@/lib/api-utils";

export async function POST() {
  return api403("Direct take is disabled. Use the request flow: Request to take → Logistics approves → Owner confirms handoff.");
}
