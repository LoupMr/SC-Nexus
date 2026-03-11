import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export default function PageHeader({ icon: Icon, title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 chamfer-sm bg-holo/10 border border-holo/30 flex items-center justify-center shadow-[0_0_8px_rgba(92,225,230,0.3)]">
          <Icon className="w-5 h-5 text-holo drop-shadow-[0_0_4px_rgba(92,225,230,0.5)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-space-200 mobiglas-heading tracking-[0.08em] uppercase">{title}</h1>
          <p className="text-xs text-space-500 mobiglas-label tracking-[0.12em]">{subtitle}</p>
        </div>
      </div>
      <div className="hud-line mt-4" />
    </div>
  );
}
