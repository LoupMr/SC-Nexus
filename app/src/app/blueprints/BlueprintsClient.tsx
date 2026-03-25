"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ScrollText, Loader2, Users, CheckCircle2, Circle } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface CatalogEntry {
  id: string;
  name: string;
  contractLocation: string;
  farmNotes: string;
  materials: string[];
  usageNotes: string;
  sortOrder: number;
}

interface RosterRow {
  blueprintId: string;
  holders: { username: string; unlockedAt: string }[];
}

export default function BlueprintsClient() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [cRes, rRes, mRes] = await Promise.all([
        fetch("/api/blueprints/catalog"),
        fetch("/api/blueprints/roster"),
        fetch("/api/blueprints/mine"),
      ]);
      if (!cRes.ok || !rRes.ok || !mRes.ok) {
        setErr("Could not load blueprints.");
        return;
      }
      const c = (await cRes.json()) as CatalogEntry[];
      const r = (await rRes.json()) as RosterRow[];
      const m = (await mRes.json()) as { blueprintIds: string[] };
      setCatalog(Array.isArray(c) ? c : []);
      setRoster(Array.isArray(r) ? r : []);
      setMine(new Set(m.blueprintIds ?? []));
    } catch {
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const holdersFor = (id: string) => roster.find((x) => x.blueprintId === id)?.holders ?? [];

  const toggle = async (blueprintId: string, unlocked: boolean) => {
    setBusyId(blueprintId);
    setErr(null);
    try {
      const res = await fetch("/api/blueprints/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintId, unlocked }),
      });
      if (!res.ok) {
        const t = await res.text();
        setErr(t || "Update failed");
        return;
      }
      setMine((prev) => {
        const n = new Set(prev);
        if (unlocked) n.add(blueprintId);
        else n.delete(blueprintId);
        return n;
      });
      const rRes = await fetch("/api/blueprints/roster");
      if (rRes.ok) {
        const r = (await rRes.json()) as RosterRow[];
        setRoster(Array.isArray(r) ? r : []);
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 text-holo animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        icon={ScrollText}
        title="BLUEPRINTS HUB"
        subtitle="4.7 industry prints — farm locations, materials, and org crafter roster"
      />

      <p className="text-space-500 text-sm mb-6 max-w-2xl">
        Cards are curated org references (SCMDB, SCCrafter, community trackers). Toggle{" "}
        <strong className="text-space-400 font-medium">I have this blueprint</strong> to appear in the crafter roster.
        Update your{" "}
        <Link href="/profile" className="text-holo hover:underline">
          profile
        </Link>{" "}
        area for a quick summary.
      </p>

      {err && (
        <div className="mb-4 text-sm text-alert border border-alert/30 chamfer-md px-3 py-2 bg-alert/5">{err}</div>
      )}

      <div className="space-y-8">
        {catalog.map((bp) => {
          const holders = holdersFor(bp.id);
          const has = mine.has(bp.id);
          return (
            <article
              key={bp.id}
              className="glass-card chamfer-lg border border-glass-border overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-glass-border flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-space-200 mobiglas-heading">{bp.name}</h2>
                  <p className="text-xs text-space-600 font-mono mt-1">{bp.id}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === bp.id}
                  onClick={() => toggle(bp.id, !has)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 chamfer-md border border-holo/35 bg-holo/10 text-holo text-sm font-medium hover:bg-holo/20 transition-colors disabled:opacity-50 mobiglas-label whitespace-nowrap"
                >
                  {busyId === bp.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : has ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  {has ? "Recorded — tap to remove" : "I have this blueprint"}
                </button>
              </div>
              <div className="p-5 sm:p-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[10px] font-semibold text-space-500 mobiglas-label mb-1">Contract / location</h3>
                  <p className="text-sm text-space-300 leading-relaxed">{bp.contractLocation}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-semibold text-space-500 mobiglas-label mb-1">Farm notes</h3>
                  <p className="text-sm text-space-300 leading-relaxed">{bp.farmNotes}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-semibold text-space-500 mobiglas-label mb-1">Materials (reference)</h3>
                  <ul className="text-sm text-space-400 list-disc list-inside space-y-0.5">
                    {bp.materials.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[10px] font-semibold text-space-500 mobiglas-label mb-1">Usage</h3>
                  <p className="text-sm text-space-300 leading-relaxed">{bp.usageNotes}</p>
                </div>
              </div>
              <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                <div className="flex items-center gap-2 text-space-400 text-xs font-semibold mobiglas-label mb-2">
                  <Users className="w-4 h-4 text-holo" />
                  Crafter roster ({holders.length})
                </div>
                {holders.length === 0 ? (
                  <p className="text-xs text-space-600">No members have listed this print yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {holders.map((h) => (
                      <span
                        key={h.username}
                        className="text-[11px] px-2 py-1 chamfer-sm border border-glass-border bg-space-900/40 text-space-300"
                        title={h.unlockedAt}
                      >
                        {h.username}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
