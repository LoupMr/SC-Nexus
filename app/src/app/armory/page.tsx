"use client";

import { useState, useMemo } from "react";
import { Crosshair } from "lucide-react";
import { getAllItems } from "@/lib/database";
import ItemCard from "@/components/ItemCard";
import SearchFilter from "@/components/SearchFilter";
import PageHeader from "@/components/PageHeader";

export default function ArmoryPage() {
  const allItems = useMemo(() => getAllItems(), []);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch =
        !search || item.Name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "all" || item.category === category;
      const matchesSubcategory =
        subcategory === "all" || item.subcategory === subcategory;
      return matchesSearch && matchesCategory && matchesSubcategory;
    });
  }, [allItems, search, category, subcategory]);

  return (
    <>
      <PageHeader
        icon={Crosshair}
        title="THE ARMORY"
        subtitle="Master item database — browse all tracked equipment"
      />

      <SearchFilter
        search={search}
        onSearchChange={setSearch}
        selectedCategory={category}
        onCategoryChange={setCategory}
        selectedSubcategory={subcategory}
        onSubcategoryChange={setSubcategory}
        totalCount={allItems.length}
        filteredCount={filtered.length}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, i) => (
          <ItemCard key={`${item.Name}-${item.subcategory}-${i}`} item={item} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Crosshair className="w-12 h-12 text-space-700 mx-auto mb-3" />
          <p className="text-space-500 text-sm">No items match your search.</p>
          <p className="text-space-600 text-xs mt-1">Try adjusting your filters or search term.</p>
        </div>
      )}
    </>
  );
}
