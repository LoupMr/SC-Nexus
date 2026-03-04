"use client";

import { DatabaseItem, getItemStats, getSubcategoryLabel } from "@/lib/database";
import clsx from "clsx";
import { Box, Crosshair, Shield, Cpu, Zap, Flame, Gauge, Navigation, Wind, HeartPulse, Rocket, Target, Bomb } from "lucide-react";

const subcategoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Weapons: Crosshair,
  Missiles: Rocket,
  MissileRacks: Target,
  Turrets: Crosshair,
  Bombs: Bomb,
  BombLaunchers: Flame,
  Shields: Shield,
  PowerPlants: Zap,
  Coolers: Wind,
  QuantumDrives: Navigation,
  JumpDrives: Gauge,
  FlightBlades: Cpu,
  LifeSupport: HeartPulse,
  Miscellaneous: Box,
};

const categoryColors: Record<string, string> = {
  Vehicle_Weaponry: "text-danger bg-danger/10 border-danger/30",
  Vehicle_Components: "text-holo bg-holo/10 border-holo/30",
  Other: "text-industrial bg-industrial/10 border-industrial/30",
};

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }
  return String(value ?? "—");
}

export default function ItemCard({ item }: { item: DatabaseItem }) {
  const stats = getItemStats(item);
  const Icon = subcategoryIcons[item.subcategory] || Box;
  const colorClass = categoryColors[item.category] || categoryColors.Other;

  return (
    <div className="glass-card rounded-xl overflow-hidden flex group">
      <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-center bg-space-800/40 border-r border-glass-border">
        <Icon className={clsx("w-8 h-8 transition-transform group-hover:scale-110", colorClass.split(" ")[0])} />
      </div>

      <div className="flex-1 p-3 sm:p-4 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-space-200 truncate">{item.Name}</h3>
          <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap", colorClass)}>
            {getSubcategoryLabel(item.subcategory)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
          {stats.slice(0, 6).map((stat) => (
            <div key={stat.label} className="flex justify-between text-[11px] gap-1">
              <span className="text-space-500 truncate">{stat.label}</span>
              <span className="text-space-300 font-mono tabular-nums">{formatValue(stat.value)}</span>
            </div>
          ))}
        </div>

        {stats.length > 6 && (
          <div className="mt-1 text-[10px] text-space-600">
            +{stats.length - 6} more stats
          </div>
        )}
      </div>
    </div>
  );
}
