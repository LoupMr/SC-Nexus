import { Suspense } from "react";
import ShipsClient from "./ShipsClient";

export default function ShipsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-space-500 text-sm mobiglas-label">Loading ship matrix…</div>}>
      <ShipsClient />
    </Suspense>
  );
}
