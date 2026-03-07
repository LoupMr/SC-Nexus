"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Users, Trash2, X, AlertCircle, Loader2, ScrollText } from "lucide-react";
import { useAuth, UserRole } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { useRouter } from "next/navigation";
import clsx from "clsx";

const RANK_OPTIONS = [
  { value: "none", label: "No role (hidden from roster)" },
  { value: "supreme_commander", label: "Supreme Commander" },
  { value: "executive_commander", label: "Executive Commander" },
  { value: "captain", label: "Captain" },
  { value: "non_commissioned_officer", label: "Non-Commissioned Officer" },
  { value: "operator", label: "Operator" },
  { value: "black_horizon_group_ally", label: "Black Horizon Group Ally" },
];

interface MemberDisplay {
  username: string;
  avatarUrl?: string | null;
  role: UserRole;
  roles: string[];
  rank: string;
}

const roleBadge: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "text-industrial bg-industrial/10 border-industrial/30" },
  logistics: { label: "Logistics", color: "text-success bg-success/10 border-success/30" },
  ops: { label: "Ops", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  raffle: { label: "Raffle", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  guide: { label: "Guide", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  viewer: { label: "Viewer", color: "text-holo bg-holo/10 border-holo/30" },
};

export default function MembersPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<MemberDisplay[]>([]);
  const [auditLog, setAuditLog] = useState<{ id: number; action: string; actor: string; targetType: string | null; targetId: string | null; details: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/members");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }, []);

  const fetchAudit = useCallback(async () => {
    const res = await fetch("/api/audit?limit=50");
    if (res.ok) setAuditLog(await res.json());
  }, []);

  useEffect(() => {
    if (!isAdmin) { router.replace("/"); return; }
    const id = setTimeout(() => {
      void fetchMembers();
      void fetchAudit();
    }, 0);
    return () => clearTimeout(id);
  }, [isAdmin, router, fetchMembers, fetchAudit]);

  const handleRolesChange = async (username: string, roles: string[]) => {
    await fetch(`/api/members/${encodeURIComponent(username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles }),
    });
    await fetchMembers();
  };

  const toggleMemberRole = (username: string, role: string) => {
    const member = members.find((m) => m.username === username);
    if (!member) return;
    const roles = member.roles ?? [member.role ?? "viewer"];
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    if (next.length === 0) return; // must have at least one
    handleRolesChange(username, next);
  };

  const handleRankChange = async (username: string, rank: string) => {
    await fetch(`/api/members/${encodeURIComponent(username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rank }),
    });
    await fetchMembers();
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/members/${encodeURIComponent(deleteTarget)}`, { method: "DELETE" });
    setDeleteTarget(null);
    await fetchMembers();
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <>
        <PageHeader icon={Users} title="MEMBERS" subtitle="Manage Org members — roles and access control" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-holo animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={Users}
        title="MEMBERS"
        subtitle="Manage Org members — roles and access control"
      />

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-glass-border text-[11px] text-space-500 uppercase tracking-wider font-medium">
          <span>Member</span>
          <span>Rank</span>
          <span>Role</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-glass-border">
          {members.map((member) => {
            const roles = member.roles ?? [member.role ?? "viewer"];
            const isSelf = user?.username === member.username;

            return (
              <div
                key={member.username}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-space-800/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {member.avatarUrl ? (
                    <Image src={member.avatarUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-glass-border" unoptimized />
                  ) : (
                    <div className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border flex-shrink-0",
                      roles.includes("admin")
                        ? "bg-industrial/10 border-industrial/30 text-industrial"
                        : "bg-space-800/50 border-space-700/30 text-space-400"
                    )}>
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-sm text-space-200 font-medium block truncate">
                      {member.username}
                      {isSelf && <span className="text-[10px] text-space-500 ml-2">(you)</span>}
                    </span>
                  </div>
                </div>

                <select
                  value={member.rank || "operator"}
                  title={member.rank === "none" ? "Hidden from roster" : undefined}
                  onChange={(e) => handleRankChange(member.username, e.target.value)}
                  className="text-[11px] px-3 py-1.5 rounded-lg border font-medium appearance-none cursor-pointer transition-all bg-space-900/40 border-space-700/30 text-space-300"
                >
                  {RANK_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-1">
                  {(["viewer", "logistics", "ops", "raffle", "guide", "admin"] as const).map((r) => {
                    const badge = roleBadge[r];
                    const active = roles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleMemberRole(member.username, r)}
                        disabled={isSelf}
                        title={active ? `Remove ${badge.label}` : `Add ${badge.label}`}
                        className={clsx(
                          "text-[10px] px-2 py-0.5 rounded border font-medium transition-all",
                          active ? badge.color : "border-space-700/50 text-space-500 bg-space-900/40",
                          isSelf && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {badge.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setDeleteTarget(member.username)}
                  disabled={isSelf}
                  className={clsx(
                    "p-2 rounded-lg text-space-500 hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all",
                    isSelf && "opacity-20 pointer-events-none"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-space-700 mx-auto mb-2" />
            <p className="text-space-500 text-sm">No members found.</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 text-[11px] text-space-500">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>You can change your own rank. You cannot change your own roles or remove yourself. Admins and Guide role can approve guides for publication. Viewers have read-only access.</span>
      </div>

      {/* Audit Log */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold text-space-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ScrollText className="w-4 h-4" /> Audit Log
        </h2>
        <div className="glass-card rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {auditLog.length === 0 ? (
            <div className="p-6 text-center text-space-500 text-sm">No audit entries yet.</div>
          ) : (
            <div className="divide-y divide-glass-border">
              {auditLog.map((e) => (
                <div key={e.id} className="px-4 py-2 text-xs flex flex-wrap items-center gap-2">
                  <span className="text-space-500 font-mono">{new Date(e.createdAt).toLocaleString()}</span>
                  <span className="font-medium text-space-300">{e.actor}</span>
                  <span className="text-holo">{e.action}</span>
                  {e.targetType && <span className="text-space-500">{e.targetType}: {e.targetId}</span>}
                  {e.details && <span className="text-space-600 truncate max-w-[200px]" title={e.details}>{e.details}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-danger/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-space-200 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-danger" /> Remove Member
              </h2>
              <button onClick={() => setDeleteTarget(null)} className="text-space-500 hover:text-space-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-space-400 mb-4">
              Remove <strong className="text-space-200">{deleteTarget}</strong> from the Org? They will no longer be able to log in.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-space-800/50 border border-space-700/30 text-space-300 rounded-lg text-sm font-medium hover:bg-space-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                className="flex-1 py-2.5 bg-danger/20 border border-danger/40 text-danger rounded-lg text-sm font-medium hover:bg-danger/30 transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
