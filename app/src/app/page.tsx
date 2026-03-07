"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-holo/5 border border-holo/20 text-holo text-xs mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-holo animate-pulse-glow" />
            BLACK HORIZON GROUP
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-space-200 tracking-tight mb-2">
            Organizational Doctrine
          </h1>
          <p className="text-holo font-medium text-lg">Precision. Intelligence. Dominance.</p>
        </div>

        {/* Condensed doctrine */}
        <div className="glass-card rounded-xl p-6 sm:p-8 space-y-6 text-sm text-space-300 leading-relaxed">
          <p>
            Black Horizon Group exists to establish structured battlefield control through discipline, coordination, and strategic execution. We are not chaos — we are calculated force.
          </p>

          <div>
            <h2 className="text-space-200 font-semibold mb-2 uppercase tracking-wider text-xs">Core Principles</h2>
            <ul className="space-y-1.5 text-space-400">
              <li><span className="text-holo">•</span> Discipline before aggression — engagement is intentional, never emotional</li>
              <li><span className="text-holo">•</span> Intelligence wins wars — recon and tactical intel are force multipliers</li>
              <li><span className="text-holo">•</span> Chain of command is absolute — orders flow down, reports flow up</li>
              <li><span className="text-holo">•</span> Coordination over heroics — we fight as a unit</li>
              <li><span className="text-holo">•</span> Growth through structure — operators are trained, leadership is earned</li>
            </ul>
          </div>

          <p>
            We do not chase fights. We shape battlefields. Operations follow: Intelligence → Planning → Deployment → Engagement → Extraction → Review.
          </p>

          <p className="text-space-400 italic">
            We do not improvise chaos. We do not tolerate disorder. We do not surrender control of the battlefield.
          </p>

          <p className="text-space-200 font-medium text-center">
            Forged by veterans. Built through structure. Prepared for dominance.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-space-800/60 border border-glass-border text-space-200 font-medium hover:bg-space-800 hover:border-holo/30 transition-all"
          >
            View Guides
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Enter Portal
          </Link>
        </div>

        <div className="hud-line mt-12" />
        <p className="text-center text-[10px] text-space-600 mt-4 uppercase tracking-widest">
          SC-Nexus v1.0 — © LoupMr. Proprietary. All rights reserved.
        </p>
      </div>
    </div>
  );
}
