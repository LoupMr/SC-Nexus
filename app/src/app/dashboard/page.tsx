"use client";

import { useState, useEffect } from "react";
import { Shield, Crosshair, BookOpen, BookMarked, ArrowRight, Database, Users, Radar, Medal, UserCheck, Link2, Rocket, ScrollText, Sparkles } from "lucide-react";
import Link from "next/link";
import { getAllItems } from "@/lib/database";
import { getAllShips } from "@/lib/ships";

const features = [
  {
    href: "/armory",
    icon: Crosshair,
    title: "The Armory",
    description: "Browse the complete item database. Search and filter ship weapons, components, and miscellaneous gear.",
    accent: "holo",
    count: "items",
  },
  {
    href: "/ships",
    icon: Rocket,
    title: "Ship Matrix",
    description: "FleetYards-backed ship specs, hardpoints, and one-click links to Armory filters.",
    accent: "holo",
    count: "ships",
  },
  {
    href: "/guide",
    icon: BookMarked,
    title: "Guides",
    description: "Org guides and tutorials. Written by members for new recruits. Viewable without login.",
    accent: "holo",
    count: "guides",
  },
  {
    href: "/ledger",
    icon: BookOpen,
    title: "The Ledger",
    description: "Track Org inventory with real-time stock levels. Manage who took what, when, and where.",
    accent: "industrial",
    count: "entries",
  },
  {
    href: "/blueprints",
    icon: ScrollText,
    title: "Blueprints Hub",
    description: "4.7 industry blueprints — where to farm, materials, and which members hold each print.",
    accent: "industrial",
    count: "prints",
  },
  {
    href: "/conquest-ops",
    icon: Shield,
    title: "Operation Guide",
    description: "Step-by-step tactical operation guides. Mission objectives, station walkthroughs, and map links.",
    accent: "danger",
    count: "ops",
  },
  {
    href: "/merits",
    icon: Medal,
    title: "Merits & Rewards",
    description: "Service record, hangar access, and participation awards. Earn merits and select rewards.",
    accent: "holo",
    count: "merits",
  },
  {
    href: "/roster",
    icon: UserCheck,
    title: "Roster",
    description: "Org members and ranks. See who's in the organization and their roles.",
    accent: "industrial",
    count: "members",
  },
  {
    href: "/links",
    icon: Link2,
    title: "Useful Links",
    description: "Star Citizen resources. UIF, Resource Hub, Wikelo sheet, and more.",
    accent: "danger",
    count: "links",
  },
];

const accentMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  holo: { bg: "bg-holo/10", border: "border-holo/30", text: "text-holo", glow: "shadow-holo/20" },
  industrial: { bg: "bg-industrial/10", border: "border-industrial/30", text: "text-industrial", glow: "shadow-industrial/20" },
  danger: { bg: "bg-alert/10", border: "border-alert/30", text: "text-alert", glow: "shadow-alert/20" },
};

export default function DashboardPage() {
  const allItems = getAllItems();
  const allShips = getAllShips();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [opsCount, setOpsCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/members/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.count != null) setMemberCount(data.count); })
      .catch(() => {});
    fetch("/api/operations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setOpsCount(data.length); })
      .catch(() => {});
  }, []);

  const stats = [
    { icon: Database, label: "Total Items", value: allItems.length },
    { icon: Users, label: "Members", value: memberCount ?? "—" },
    { icon: Radar, label: "Available Ops", value: opsCount ?? "—" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12 mt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 chamfer-sm bg-holo/5 border border-holo/20 text-holo text-xs mb-4 mobiglas-label shadow-[0_0_8px_rgba(92,225,230,0.2)]">
          <div className="w-1.5 h-1.5 bg-holo animate-pulse-glow" />
          SYSTEM ONLINE
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-space-200 mobiglas-heading tracking-[0.08em] mb-3">
          SC-<span className="text-holo glow-text">NEXUS</span>
        </h1>
        <p className="text-space-500 max-w-md mx-auto mb-1 mobiglas-label">
          <span className="text-space-400 font-medium">Black Horizon Group</span>
        </p>
        <p className="text-space-500 max-w-md mx-auto">
          Org Logistics & Operations Portal. Manage assets, track inventory, and coordinate Conquest Zone operations.
        </p>
      </div>

      <div className="mb-8 chamfer-lg border border-holo/25 bg-holo/5 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-holo flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-holo mobiglas-label tracking-wide mb-1">Alpha 4.7 — Industry &amp; Economy</p>
            <p className="text-sm text-space-300 leading-relaxed mb-3">
              Update your{" "}
              <Link href="/profile" className="text-holo hover:underline">
                profile
              </Link>{" "}
              with newly acquired blueprints, browse the{" "}
              <Link href="/blueprints" className="text-holo hover:underline">
                Blueprints Hub
              </Link>
              , and check{" "}
              <Link href="/guide" className="text-holo hover:underline">
                guides
              </Link>{" "}
              for Nyx, and combat loadout notes. Use the{" "}
              <Link href="/ships" className="text-holo hover:underline">
                Ship Matrix
              </Link>{" "}
              for hardpoint → Armory links.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card chamfer-md p-3 sm:p-4 text-center">
            <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-holo mx-auto mb-1.5 sm:mb-2 drop-shadow-[0_0_6px_rgba(92,225,230,0.4)]" />
            <div className="text-xl sm:text-2xl font-bold text-space-200 font-mono tabular-nums">{stat.value}</div>
            <div className="text-[10px] sm:text-[11px] text-space-500 mobiglas-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const colors = accentMap[feature.accent];
          const countValue =
            feature.count === "items"
              ? allItems.length
              : feature.count === "ships"
                ? allShips.length
                : feature.count === "prints"
                  ? "—"
                  : null;
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="glass-card chamfer-md p-5 group relative overflow-hidden hover:shadow-[0_0_16px_rgba(92,225,230,0.2)] transition-all duration-300"
            >
              <div className={`absolute top-0 left-0 w-full h-[2px] ${colors.bg} opacity-60`} />
              <div className={`w-10 h-10 chamfer-sm ${colors.bg} border ${colors.border} flex items-center justify-center mb-3 shadow-[0_0_8px_rgba(92,225,230,0.2)]`}>
                <feature.icon className={`w-5 h-5 ${colors.text} drop-shadow-[0_0_4px_currentColor]`} />
              </div>
              <h3 className="text-lg font-semibold text-space-200 mb-1 mobiglas-heading">{feature.title}</h3>
              <p className="text-xs text-space-500 mb-2 leading-relaxed">{feature.description}</p>
              {countValue !== null && (
                <p className="text-[10px] font-mono text-space-600 mobiglas-label mb-2">
                  {typeof countValue === "number" ? `${countValue.toLocaleString()} ${feature.count}` : countValue}
                </p>
              )}
              <div className={`flex items-center gap-1 text-xs font-medium ${colors.text} group-hover:gap-2 transition-all mobiglas-label`}>
                ENTER <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hud-line mt-12" />
      <p className="text-center text-[10px] text-space-600 mt-4 mobiglas-label tracking-[0.2em]">
        SC-Nexus v1.0 — © LoupMr. Proprietary. All rights reserved.
      </p>
    </div>
  );
}
