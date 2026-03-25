import Link from "next/link";
import { LogIn, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="home-content min-h-[calc(100vh-9rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 chamfer-sm bg-holo/5 border border-holo/20 text-holo text-xs mb-4 mobiglas-label shadow-[0_0_8px_rgba(92,225,230,0.2)]">
            <div className="w-1.5 h-1.5 bg-holo animate-pulse-glow" />
            BLACK HORIZON GROUP
          </div>
          <h1 className="hero-title text-3xl sm:text-4xl font-bold mobiglas-heading tracking-[0.08em] uppercase mb-2 glow-text">
            Organizational Doctrine
          </h1>
          <p className="hero-subtitle font-semibold text-lg glow-text mobiglas-label">Precision. Intelligence. Dominance.</p>
        </div>

        <div className="mb-8 chamfer-lg border border-holo/30 bg-holo/5 px-4 py-4 sm:px-5 sm:py-4 shadow-[0_0_20px_rgba(92,225,230,0.12)]">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-holo flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-xs font-semibold text-holo mobiglas-label tracking-wide mb-1">Patch 4.7 readiness</p>
              <p className="text-sm text-space-300 leading-relaxed">
                Industry &amp; economy systems are in focus — review public{" "}
                <Link href="/guide" className="text-holo hover:underline">
                  guides
                </Link>{" "}
                for QV Breakers, Nyx PSS, and inventory doctrine. Members: use the portal after{" "}
                <Link href="/login" className="text-holo hover:underline">
                  login
                </Link>{" "}
                for blueprints, ship matrix, and loadout links.
              </p>
            </div>
          </div>
        </div>

        {/* Condensed doctrine */}
        <div className="glass-card chamfer-lg p-6 sm:p-8 space-y-6 text-sm text-space-300 leading-relaxed">
          <p>
            Black Horizon Group exists to establish structured battlefield control through discipline, coordination, and strategic execution. We are not chaos — we are calculated force.
          </p>

          <div>
            <h2 className="text-space-200 font-semibold mb-2 mobiglas-label text-xs">Core Principles</h2>
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
            className="inline-flex items-center gap-2 px-6 py-3 chamfer-md bg-space-800/60 border border-glass-border text-space-200 font-medium hover:bg-space-800 hover:border-holo/30 hover:shadow-[0_0_8px_rgba(92,225,230,0.2)] transition-all mobiglas-label"
          >
            View Guides
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 chamfer-md bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 hover:shadow-[0_0_12px_rgba(92,225,230,0.4)] transition-all mobiglas-label"
          >
            <LogIn className="w-4 h-4" />
            Enter Portal
          </Link>
        </div>

        <div className="hud-line mt-12" />
        <p className="hero-footer text-center text-[10px] mt-4 mobiglas-label tracking-[0.2em]">
          SC-Nexus v1.0 — © LoupMr. Proprietary. All rights reserved.
        </p>
      </div>
    </div>
  );
}
