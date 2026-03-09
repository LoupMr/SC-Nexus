"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, Target, CheckCircle2, Circle, AlertTriangle,
  ChevronDown, ChevronUp, Key, Map as MapIcon, X,
  Plus, Pencil, Trash2, Loader2, GripVertical,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import clsx from "clsx";
import { inputClass } from "@/lib/styles";

interface OpStep {
  id?: number;
  order: number;
  station: string;
  target: string;
  requirements: string;
  description: string;
  mapUrl: string | null;
}

interface Operation {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  steps: OpStep[];
}

const priorityColors: Record<string, string> = {
  high: "text-danger",
  medium: "text-industrial",
  low: "text-success",
};

const statusBadges: Record<string, string> = {
  active: "text-holo bg-holo/10 border-holo/30",
  planning: "text-industrial bg-industrial/10 border-industrial/30",
  complete: "text-success bg-success/10 border-success/30",
};

const STATION_COLORS: Record<string, string> = {
  "PYAM-SUPVISR-3-4": "bg-holo/10 border-holo/30 text-holo",
  "PYAM-SUPVISR-3-5": "bg-holo/10 border-holo/30 text-holo",
  Checkmate: "bg-industrial/10 border-industrial/30 text-industrial",
  Orbituary: "bg-danger/10 border-danger/30 text-danger",
  Ruin: "bg-purple-500/10 border-purple-500/30 text-purple-400",
};

function getStationColor(station: string): string {
  return STATION_COLORS[station] || "bg-space-800/50 border-space-700/30 text-space-400";
}

type ModalMode = null | "create" | "edit" | "delete";

const emptyStep = (): OpStep => ({ order: 1, station: "", target: "", requirements: "", description: "", mapUrl: null });
const selectClass = `${inputClass} appearance-none`;

export default function OperationGuidePage() {
  const { canEditOps } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());
  const [filterStation, setFilterStation] = useState<Record<string, string>>({});
  const [openMap, setOpenMap] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "active",
    priority: "medium",
    steps: [emptyStep()] as OpStep[],
  });

  const fetchOps = useCallback(async (autoExpand = false) => {
    const res = await fetch("/api/operations");
    if (res.ok) {
      const data = await res.json();
      setOperations(data);
      if (autoExpand && data.length > 0) setExpandedOp(data[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void fetchOps(false), 0);
    return () => clearTimeout(id);
  }, [fetchOps]);

  const toggleStep = (opId: string, stepOrder: number) => {
    const key = `${opId}-${stepOrder}`;
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getFilter = (opId: string) => filterStation[opId] || "all";
  const setFilter = (opId: string, val: string) => setFilterStation((p) => ({ ...p, [opId]: val }));

  const openCreateModal = () => {
    setForm({ title: "", description: "", status: "active", priority: "medium", steps: [emptyStep()] });
    setEditingOp(null);
    setModalMode("create");
  };

  const openEditModal = (op: Operation) => {
    setForm({
      title: op.title,
      description: op.description,
      status: op.status,
      priority: op.priority,
      steps: op.steps.length > 0 ? op.steps.map((s) => ({ ...s })) : [emptyStep()],
    });
    setEditingOp(op);
    setModalMode("edit");
  };

  const openDeleteModal = (op: Operation) => {
    setEditingOp(op);
    setModalMode("delete");
  };

  const addStep = () => {
    setForm((p) => ({
      ...p,
      steps: [...p.steps, { ...emptyStep(), order: p.steps.length + 1 }],
    }));
  };

  const removeStep = (idx: number) => {
    setForm((p) => ({
      ...p,
      steps: p.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const updateStep = (idx: number, field: keyof OpStep, value: string | number | null) => {
    setForm((p) => ({
      ...p,
      steps: p.steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.description) return;
    setBusy(true);

    const stepsPayload = form.steps
      .filter((s) => s.target || s.station || s.description)
      .map((s, i) => ({ order: i + 1, station: s.station, target: s.target, requirements: s.requirements, description: s.description, mapUrl: s.mapUrl || null }));

    const payload = {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      steps: stepsPayload,
    };

    if (modalMode === "create") {
      await fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else if (modalMode === "edit" && editingOp) {
      await fetch(`/api/operations/${editingOp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setModalMode(null);
    setEditingOp(null);
    await fetchOps();
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!editingOp) return;
    setBusy(true);
    await fetch(`/api/operations/${editingOp.id}`, { method: "DELETE" });
    setModalMode(null);
    setEditingOp(null);
    await fetchOps();
    setBusy(false);
  };

  if (loading) {
    return (
      <>
        <PageHeader icon={Shield} title="OPERATION GUIDE" subtitle="Tactical operations planning — mission briefs, step-by-step guides & objectives" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-holo animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={Shield}
        title="OPERATION GUIDE"
        subtitle="Tactical operations planning — mission briefs, step-by-step guides & objectives"
      />

      {canEditOps && (
        <div className="mb-4">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-holo/10 border border-holo/30 text-holo rounded-lg text-sm font-medium hover:bg-holo/20 transition-all"
          >
            <Plus className="w-4 h-4" /> New Operation Guide
          </button>
        </div>
      )}

      <div className="space-y-4">
        {operations.map((op) => {
          const isExpanded = expandedOp === op.id;
          const stationFilter = getFilter(op.id);
          const stations = [...new Set(op.steps.map((s) => s.station).filter(Boolean))];
          const filteredSteps = stationFilter === "all" ? op.steps : op.steps.filter((s) => s.station === stationFilter);
          const checkedCount = op.steps.filter((s) => checkedSteps.has(`${op.id}-${s.order}`)).length;
          const statusBadge = statusBadges[op.status] || statusBadges.active;
          const priorityColor = priorityColors[op.priority] || priorityColors.medium;

          return (
            <div key={op.id} className="glass-card rounded-xl overflow-hidden">
              <div className="w-full p-5 flex items-center gap-4">
                <button onClick={() => setExpandedOp(isExpanded ? null : op.id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0 bg-danger/10 border-danger/30 text-danger">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-semibold text-space-200">{op.title}</h3>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", statusBadge)}>
                        {op.status}
                      </span>
                      <span className={clsx("text-[10px] font-medium flex items-center gap-1 capitalize", priorityColor)}>
                        <AlertTriangle className="w-3 h-3" /> {op.priority}
                      </span>
                    </div>
                    <p className="text-xs text-space-500 line-clamp-1">{op.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <div className="text-xs text-space-400 font-mono">{checkedCount}/{op.steps.length}</div>
                    <div className="text-[10px] text-space-600">complete</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-space-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-space-500 flex-shrink-0" />}
                </button>

                {canEditOps && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEditModal(op)} className="p-2 rounded-lg text-space-500 hover:text-holo hover:bg-holo/10 border border-transparent hover:border-holo/20 transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDeleteModal(op)} className="p-2 rounded-lg text-space-500 hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-glass-border">
                  <div className="p-5">
                    <p className="text-sm text-space-400 mb-4">{op.description}</p>

                    {stations.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        <button onClick={() => setFilter(op.id, "all")} className={clsx("px-2.5 py-1 rounded text-[11px] font-medium border transition-all", stationFilter === "all" ? "bg-holo/10 border-holo/30 text-holo" : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400")}>
                          All Stations
                        </button>
                        {stations.map((station) => (
                          <button key={station} onClick={() => setFilter(op.id, station)} className={clsx("px-2.5 py-1 rounded text-[11px] font-medium border transition-all", stationFilter === station ? getStationColor(station) : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400")}>
                            {station}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {filteredSteps.map((step) => {
                        const isDone = checkedSteps.has(`${op.id}-${step.order}`);
                        return (
                          <div key={step.order} className={clsx("rounded-lg border transition-all overflow-hidden", isDone ? "bg-success/5 border-success/15 opacity-60" : "bg-space-900/30 border-space-700/20")}>
                            <div className="flex items-start gap-3 p-3">
                              <button onClick={() => toggleStep(op.id, step.order)} className="mt-0.5 flex-shrink-0">
                                {isDone ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-space-600 hover:text-space-400 transition-colors" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-[10px] font-mono text-space-500 bg-space-800/60 px-1.5 py-0.5 rounded">#{step.order}</span>
                                  {step.station && (
                                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium", getStationColor(step.station))}>
                                      {step.station}
                                    </span>
                                  )}
                                  <h4 className={clsx("text-sm font-medium", isDone ? "text-space-500 line-through" : "text-space-200")}>{step.target}</h4>
                                </div>
                                <p className="text-xs text-space-400 mb-2">{step.description}</p>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {step.requirements && (
                                    <span className="flex items-center gap-1 text-[11px] text-industrial"><Key className="w-3 h-3" />{step.requirements}</span>
                                  )}
                                  {step.mapUrl && (
                                    <button onClick={() => setOpenMap(step.mapUrl)} className="flex items-center gap-1 text-[11px] text-holo hover:text-holo/80 transition-colors">
                                      <MapIcon className="w-3 h-3" /> View Map
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredSteps.length === 0 && (
                      <div className="text-center py-8"><p className="text-space-500 text-sm">No steps for this filter.</p></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {operations.length === 0 && (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-space-700 mx-auto mb-3" />
            <p className="text-space-500 text-sm">No operation guides yet.</p>
          </div>
        )}
      </div>

      {/* Map Lightbox */}
      {openMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setOpenMap(null)}>
          <div className="relative w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpenMap(null)} className="absolute -top-10 right-0 text-space-400 hover:text-space-200 transition-colors"><X className="w-6 h-6" /></button>
            <div className="glass-card rounded-xl overflow-hidden border border-glass-border">
              <iframe src={`${openMap}/embed?pub=true&w=720`} className="w-full" style={{ height: "70vh" }} allowFullScreen />
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl mx-4 border border-holo/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-space-200 flex items-center gap-2">
                {modalMode === "create" ? <><Plus className="w-5 h-5 text-holo" /> New Operation</> : <><Pencil className="w-5 h-5 text-holo" /> Edit Operation</>}
              </h2>
              <button onClick={() => setModalMode(null)} className="text-space-500 hover:text-space-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-space-400 mb-1 block">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Operation name" className={inputClass} />
              </div>

              <div>
                <label className="text-xs text-space-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder="Brief description" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-space-400 mb-1 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className={selectClass}>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-space-400 mb-1 block">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className={selectClass}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-space-400">Steps</label>
                  <button type="button" onClick={addStep} className="flex items-center gap-1 text-[11px] text-holo hover:text-holo/80 transition-colors">
                    <Plus className="w-3 h-3" /> Add Step
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="rounded-lg border border-space-700/20 bg-space-900/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-space-400">
                          <GripVertical className="w-3 h-3" /> Step {idx + 1}
                        </span>
                        {form.steps.length > 1 && (
                          <button type="button" onClick={() => removeStep(idx)} className="text-danger/60 hover:text-danger text-[10px]">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={step.station} onChange={(e) => updateStep(idx, "station", e.target.value)} placeholder="Station" className={inputClass} />
                        <input type="text" value={step.target} onChange={(e) => updateStep(idx, "target", e.target.value)} placeholder="Target / Objective" className={inputClass} />
                      </div>
                      <input type="text" value={step.requirements} onChange={(e) => updateStep(idx, "requirements", e.target.value)} placeholder="Requirements" className={inputClass} />
                      <textarea value={step.description} onChange={(e) => updateStep(idx, "description", e.target.value)} rows={2} placeholder="Step description" className={inputClass} />
                      <input type="text" value={step.mapUrl || ""} onChange={(e) => updateStep(idx, "mapUrl", e.target.value || null)} placeholder="Map URL (optional, e.g. imgur album)" className={inputClass} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!form.title || !form.description || busy}
              className="w-full mt-5 py-2.5 bg-holo/20 border border-holo/40 text-holo rounded-lg text-sm font-medium hover:bg-holo/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Saving..." : modalMode === "create" ? "Create Operation" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modalMode === "delete" && editingOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-danger/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-space-200 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-danger" /> Delete Operation
              </h2>
              <button onClick={() => setModalMode(null)} className="text-space-500 hover:text-space-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="glass-card rounded-lg p-3 mb-4 border border-glass-border">
              <p className="text-sm font-medium text-space-200">{editingOp.title}</p>
              <p className="text-[11px] text-space-500 mt-1">{editingOp.steps.length} steps — {editingOp.status}</p>
            </div>
            <p className="text-xs text-space-400 mb-4">This will permanently remove this operation guide and all its steps. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalMode(null)} className="flex-1 py-2.5 bg-space-800/50 border border-space-700/30 text-space-300 rounded-lg text-sm font-medium hover:bg-space-800 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={busy} className="flex-1 py-2.5 bg-danger/20 border border-danger/40 text-danger rounded-lg text-sm font-medium hover:bg-danger/30 transition-all disabled:opacity-50">
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
