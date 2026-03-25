import { Suspense } from "react";
import MissionsClient from "./MissionsClient";

function MissionsFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-space-500 text-sm mobiglas-label">
      Loading missions…
    </div>
  );
}

export default function MissionsPage() {
  return (
    <Suspense fallback={<MissionsFallback />}>
      <MissionsClient />
    </Suspense>
  );
}
