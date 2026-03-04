"use client";

import { useState, useEffect } from "react";
import { Shield, Crosshair, BookOpen, ArrowRight, Database, Users, Radar } from "lucide-react";
import Link from "next/link";
import { getAllItems } from "@/lib/database";

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
    href: "/ledger",
    icon: BookOpen,
    title: "The Ledger",
    description: "Track Org inventory with real-time stock levels. Manage who took what, when, and where.",
    accent: "industrial",
    count: "entries",
  },
  {
    href: "/conquest-ops",
    icon: Shield,
    title: "Operation Guide",
    description: "Step-by-step tactical operation guides. Mission objectives, station walkthroughs, and map links.",
    accent: "danger",
    count: "ops",
  },
];

const accentMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  holo: { bg: "bg-holo/10", border: "border-holo/30", text: "text-holo", glow: "shadow-holo/20" },
  industrial: { bg: "bg-industrial/10", border: "border-industrial/30", text: "text-industrial", glow: "shadow-industrial/20" },
  danger: { bg: "bg-danger/10", border: "border-danger/30", text: "text-danger", glow: "shadow-danger/20" },
};

export default function Home() {
  const allItems = getAllItems();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [opsCount, setOpsCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setMemberCount(data.length); })
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-holo/5 border border-holo/20 text-holo text-xs mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-holo animate-pulse-glow" />
          SYSTEM ONLINE
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-space-200 tracking-tight mb-3">
          SC-<span className="text-holo glow-text">NEXUS</span>
        </h1>
        <p className="text-space-500 max-w-md mx-auto">
          Org Logistics & Operations Portal. Manage assets, track inventory, and coordinate Conquest Zone operations.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
            <stat.icon className="w-5 h-5 text-holo mx-auto mb-2" />
            <div className="text-2xl font-bold text-space-200 font-mono">{stat.value}</div>
            <div className="text-[11px] text-space-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {features.map((feature) => {
          const colors = accentMap[feature.accent];
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="glass-card rounded-xl p-5 group relative overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className={`absolute top-0 left-0 w-full h-[2px] ${colors.bg} opacity-60`} />
              <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center mb-3`}>
                <feature.icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <h3 className="text-lg font-semibold text-space-200 mb-1">{feature.title}</h3>
              <p className="text-xs text-space-500 mb-4 leading-relaxed">{feature.description}</p>
              <div className={`flex items-center gap-1 text-xs font-medium ${colors.text} group-hover:gap-2 transition-all`}>
                Enter <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hud-line mt-12" />
      <p className="text-center text-[10px] text-space-600 mt-4 uppercase tracking-widest">
        SC-Nexus v1.0 — Star Citizen Org Management System
      </p>
    </div>
  );
}
