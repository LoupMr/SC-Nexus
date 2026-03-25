"use client";

import { memo } from "react";
import Image from "next/image";
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
  Radars: Cpu,
  TractorBeams: Wind,
  SelfDestructs: Bomb,
  ShipEMP: Zap,
  SalvageModifiers: Box,
  QuantumInterdictionGenerators: Navigation,
  WeaponDefensive: Shield,
  WeaponMining: Flame,
  MiningModifiers: Flame,
  Miscellaneous: Box,
  FPSWeapons: Crosshair,
  CombatArmor: Shield,
  ShipsVehicles: Rocket,
  PersonalArmor: Shield,
  WeaponAttachments: Crosshair,
};

const categoryColors: Record<string, string> = {
  Vehicle_Weaponry: "text-alert bg-alert/10 border-alert/30",
  Vehicle_Components: "text-holo bg-holo/10 border-holo/30",
  Fpsgadgets_Utilities: "text-industrial bg-industrial/10 border-industrial/30",
  Vehicles: "text-holo bg-holo/10 border-holo/30",
  Personal_Armor: "text-industrial bg-industrial/10 border-industrial/30",
  Weapon_Attachments: "text-alert bg-alert/10 border-alert/30",
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

interface ItemCardProps {
  item: DatabaseItem;
  onClick?: () => void;
}

function ItemCardComponent({ item, onClick }: ItemCardProps) {
  const stats = getItemStats(item);
  const Icon = subcategoryIcons[item.subcategory] || Box;
  const colorClass = categoryColors[item.category] || categoryColors.Other;
  const thumb = typeof item.ThumbUrl === "string" ? item.ThumbUrl : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "glass-card chamfer-md overflow-hidden flex group w-full text-left",
        onClick && "cursor-pointer hover:border-holo/30 hover:shadow-[0_0_12px_rgba(92,225,230,0.15)] transition-all"
      )}
    >
      <div className="relative w-20 sm:w-24 flex-shrink-0 flex items-center justify-center bg-space-800/40 border-r border-glass-border min-h-[5rem]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            width={80}
            height={80}
            className="object-contain p-1.5 w-full h-full max-h-[4.5rem]"
            unoptimized={thumb.startsWith("data:")}
          />
        ) : (
          <Icon className={clsx("w-8 h-8 transition-transform group-hover:scale-110 drop-shadow-[0_0_6px_currentColor]", colorClass.split(" ")[0])} />
        )}
      </div>

      <div className="flex-1 p-3 sm:p-4 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-space-200 truncate mobiglas-label">{item.Name}</h3>
          <span className={clsx("text-[10px] px-2 py-0.5 chamfer-sm border font-medium whitespace-nowrap mobiglas-label", colorClass)}>
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
            +{stats.length - 6} more stats — click for details
          </div>
        )}
      </div>
    </button>
  );
}

export default memo(ItemCardComponent);
