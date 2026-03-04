"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { categories, subcategories } from "@/lib/database";
import clsx from "clsx";

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
}: SearchFilterProps) {
  const relevantSubs =
    selectedCategory === "all"
      ? subcategories
      : subcategories.filter((s) => s.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-space-900/60 border border-glass-border rounded-lg text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-space-500 hover:text-space-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-space-500">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="font-mono tabular-nums">
            {filteredCount} / {totalCount}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              onCategoryChange(cat.id);
              onSubcategoryChange("all");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              selectedCategory === cat.id
                ? "bg-holo/10 border-holo/30 text-holo"
                : "bg-space-900/40 border-space-700/30 text-space-400 hover:border-space-600 hover:text-space-300"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {relevantSubs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onSubcategoryChange("all")}
            className={clsx(
              "px-2.5 py-1 rounded text-[11px] font-medium border transition-all",
              selectedSubcategory === "all"
                ? "bg-industrial/10 border-industrial/30 text-industrial"
                : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
            )}
          >
            All
          </button>
          {relevantSubs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => onSubcategoryChange(sub.id)}
              className={clsx(
                "px-2.5 py-1 rounded text-[11px] font-medium border transition-all",
                selectedSubcategory === sub.id
                  ? "bg-industrial/10 border-industrial/30 text-industrial"
                  : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {(selectedCategory === "Vehicle_Weaponry" || selectedCategory === "Vehicle_Components") && (
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-space-700/40">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-space-500 font-medium">Size</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onSizeChange("all")}
                className={clsx(
                  "px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                  selectedSize === "all"
                    ? "bg-danger/10 border-danger/30 text-danger"
                    : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                )}
              >
                All
              </button>
              {[...availableSizes].sort((a, b) => a - b).map((s) => (
                <button
                  key={s}
                  onClick={() => onSizeChange(String(s))}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[11px] font-medium border transition-all min-w-[1.5rem]",
                    selectedSize === String(s)
                      ? "bg-danger/10 border-danger/30 text-danger"
                      : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-space-500 font-medium">Grade</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onGradeChange("all")}
                className={clsx(
                  "px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                  selectedGrade === "all"
                    ? "bg-danger/10 border-danger/30 text-danger"
                    : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                )}
              >
                All
              </button>
              {[...availableGrades].sort().map((g) => (
                <button
                  key={g}
                  onClick={() => onGradeChange(g)}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[11px] font-medium border transition-all min-w-[1.5rem]",
                    selectedGrade === g
                      ? "bg-danger/10 border-danger/30 text-danger"
                      : "bg-space-900/30 border-space-700/20 text-space-500 hover:text-space-400"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
