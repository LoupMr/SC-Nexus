"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { categories, subcategories } from "@/lib/database";
import clsx from "clsx";

/** Browse order (ships/vehicles live on /ships). */
const CATEGORY_ORDER: string[] = [
  "all",
  "Vehicle_Weaponry",
  "Vehicle_Components",
  "Fpsgadgets_Utilities",
  "Personal_Armor",
  "Weapon_Attachments",
  "Other",
];

function sortCategories<T extends { id: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.id);
    const ib = CATEGORY_ORDER.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

function categoryOptionLabel(cat: { id: string; label: string }): string {
  if (cat.id === "all") return "Everything";
  return cat.label;
}

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSubcategory: string;
  onSubcategoryChange: (value: string) => void;
  selectedSize: string;
  onSizeChange: (value: string) => void;
  selectedGrade: string;
  onGradeChange: (value: string) => void;
  availableSizes: number[];
  availableGrades: string[];
  totalCount: number;
  filteredCount: number;
  onClearFilters: () => void;
  /** Hide these category ids in the dropdown (e.g. Vehicles on /armory). */
  omitCategoryIds?: readonly string[];
}

export default function SearchFilter({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubcategory,
  onSubcategoryChange,
  selectedSize,
  onSizeChange,
  selectedGrade,
  onGradeChange,
  availableSizes,
  availableGrades,
  totalCount,
  filteredCount,
  onClearFilters,
  omitCategoryIds,
}: SearchFilterProps) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const orderedCategories = useMemo(() => {
    const omit = new Set(omitCategoryIds ?? []);
    return sortCategories(categories.filter((c) => !omit.has(c.id)));
  }, [omitCategoryIds]);

  const relevantSubs = useMemo(() => {
    if (selectedCategory === "all") return [];
    return subcategories.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedCategory !== "all") n += 1;
    if (selectedSubcategory !== "all") n += 1;
    if (selectedSize !== "all") n += 1;
    if (selectedGrade !== "all") n += 1;
    return n;
  }, [selectedCategory, selectedSubcategory, selectedSize, selectedGrade]);

  const showSizeGrade = availableSizes.length > 0 || availableGrades.length > 0;
  const sizeOrGradeActive = selectedSize !== "all" || selectedGrade !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            autoComplete="off"
            className="w-full pl-10 pr-10 py-2.5 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 focus:shadow-[0_0_8px_rgba(92,225,230,0.2)] transition-all mobiglas-label"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-space-500 hover:text-space-300 z-10"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 chamfer-sm text-xs font-medium border transition-all mobiglas-label",
              moreFiltersOpen || sizeOrGradeActive
                ? "bg-holo/10 border-holo/30 text-holo shadow-[0_0_8px_rgba(92,225,230,0.25)]"
                : "bg-space-900/40 border-space-700/30 text-space-500 hover:text-space-300 hover:border-glass-border"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Size / grade
            {(selectedSize !== "all" || selectedGrade !== "all") && (
              <span className="min-w-[1.25rem] rounded-sm bg-holo/20 text-holo tabular-nums px-1 text-[10px]">
                {(selectedSize !== "all" ? 1 : 0) + (selectedGrade !== "all" ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-2.5 py-2.5 chamfer-sm text-xs font-medium border border-space-700/30 text-space-500 hover:text-space-300 hover:border-space-600 mobiglas-label transition-colors"
            title="Reset category, type, size, grade, and search"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="hidden sm:flex items-center text-xs text-space-500 font-mono tabular-nums px-1">
            {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="sm:hidden text-xs text-space-500 font-mono tabular-nums">
        {filteredCount.toLocaleString()} / {totalCount.toLocaleString()} items
      </div>

      <p className="text-[11px] text-space-600 leading-relaxed -mt-1">
        <span className="text-space-500">
          {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active · ` : null}
        </span>
        <strong className="text-space-400 font-medium">Everything</strong> shows all categories below. Narrow by category or
        item type to browse a single slice.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-space-500 mobiglas-label">Category</span>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full py-2.5 px-3 chamfer-sm bg-space-950/80 border border-space-700/40 text-sm text-space-200 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 mobiglas-label relative z-0"
          >
            {orderedCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {categoryOptionLabel(cat)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-space-500 mobiglas-label">Item type</span>
          <select
            value={selectedSubcategory}
            onChange={(e) => onSubcategoryChange(e.target.value)}
            className="w-full py-2.5 px-3 chamfer-sm bg-space-950/80 border border-space-700/40 text-sm text-space-200 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 mobiglas-label relative z-0"
          >
            <option value="all">All types in this category</option>
            {selectedCategory === "all"
              ? sortCategories(
                  categories.filter((c) => c.id !== "all" && subcategories.some((s) => s.category === c.id))
                ).map((cat) => {
                  const subs = subcategories
                    .filter((s) => s.category === cat.id)
                    .sort((a, b) => a.label.localeCompare(b.label));
                  if (subs.length === 0) return null;
                  return (
                    <optgroup key={cat.id} label={categoryOptionLabel(cat)}>
                      {subs.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              : relevantSubs
                  .slice()
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
          </select>
        </label>
      </div>

      {moreFiltersOpen && showSizeGrade && (
        <div className="rounded-md border border-glass-border bg-space-900/30 p-4 space-y-3 chamfer-sm">
          <p className="text-[11px] text-space-500 mobiglas-label">
            Size &amp; grade{" "}
            <span className="text-space-600 font-normal">
              ({availableSizes.length} sizes · {availableGrades.length} grades)
            </span>
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
            {availableSizes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-space-500 font-medium w-12 shrink-0">Size</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => onSizeChange("all")}
                    className={clsx(
                      "px-2 py-0.5 chamfer-sm text-[11px] font-medium border transition-all mobiglas-label tabular-nums",
                      selectedSize === "all"
                        ? "bg-alert/10 border-alert/30 text-alert"
                        : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                    )}
                  >
                    All
                  </button>
                  {[...availableSizes].sort((a, b) => a - b).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => onSizeChange(String(s))}
                      className={clsx(
                        "px-2 py-0.5 chamfer-sm text-[11px] font-medium border transition-all min-w-[1.5rem] tabular-nums mobiglas-label",
                        selectedSize === String(s)
                          ? "bg-alert/10 border-alert/30 text-alert"
                          : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {availableGrades.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-space-500 font-medium w-12 shrink-0">Grade</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => onGradeChange("all")}
                    className={clsx(
                      "px-2 py-0.5 chamfer-sm text-[11px] font-medium border transition-all mobiglas-label",
                      selectedGrade === "all"
                        ? "bg-alert/10 border-alert/30 text-alert"
                        : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                    )}
                  >
                    All
                  </button>
                  {[...availableGrades].sort().map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => onGradeChange(g)}
                      className={clsx(
                        "px-2 py-0.5 chamfer-sm text-[11px] font-medium border transition-all min-w-[1.5rem] mobiglas-label",
                        selectedGrade === g
                          ? "bg-alert/10 border-alert/30 text-alert"
                          : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
