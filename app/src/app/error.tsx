"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 border border-danger/30 text-danger mb-6">
          <AlertTriangle className="w-8 h-8" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-space-200 mb-2">Something went wrong</h1>
        <p className="text-space-400 text-sm mb-6">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 transition-all"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-space-800/60 border border-glass-border text-space-200 font-medium hover:bg-space-800 hover:border-holo/30 transition-all"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
