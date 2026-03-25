import { Suspense } from "react";
import ArmoryClient from "./ArmoryClient";

function ArmoryFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-space-500 text-sm mobiglas-label">
      Loading armory…
    </div>
  );
}

export default function ArmoryPage() {
  return (
    <Suspense fallback={<ArmoryFallback />}>
      <ArmoryClient />
    </Suspense>
  );
}
