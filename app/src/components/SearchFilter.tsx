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
    </div>
  );
}
