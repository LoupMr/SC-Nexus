"use client";

import { useState, useMemo, useEffect } from "react";
import { Crosshair } from "lucide-react";
import { getAllItems, DatabaseItem } from "@/lib/database";
import ItemCard from "@/components/ItemCard";
import ItemDetailModal from "@/components/ItemDetailModal";
import SearchFilter from "@/components/SearchFilter";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/useAuth";

interface LedgerEntry {
  id: string;
  itemName: string;
  subcategory: string;
  owner: string;
  quantity: number;
  location: string;
  status: string;
  sharedWithOrg: boolean;
}

export default function ArmoryPage() {
  const { user } = useAuth();
  const allItems = useMemo(() => getAllItems(), []);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<DatabaseItem | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [size, setSize] = useState("all");
  const [grade, setGrade] = useState("all");

  const itemsMatchingCategory = useMemo(() => {
    return allItems.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesSubcategory = subcategory === "all" || item.subcategory === subcategory;
      return matchesCategory && matchesSubcategory;
    });
  }, [allItems, category, subcategory]);

  const availableSizes = useMemo(() => {
    const sizes = new Set<number>();
    for (const item of itemsMatchingCategory) {
      const s = item.Size;
      if (typeof s === "number" && !Number.isNaN(s)) sizes.add(s);
    }
    return Array.from(sizes);
  }, [itemsMatchingCategory]);

  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    for (const item of itemsMatchingCategory) {
      const g = item.Grade;
      if (typeof g === "string" && g) grades.add(g);
    }
    return Array.from(grades);
  }, [itemsMatchingCategory]);

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch =
        !search || item.Name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "all" || item.category === category;
      const matchesSubcategory =
        subcategory === "all" || item.subcategory === subcategory;
      const matchesSize =
        size === "all" ||
        (typeof item.Size === "number" && String(item.Size) === size);
      const matchesGrade =
        grade === "all" ||
        (typeof item.Grade === "string" && item.Grade === grade);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesSubcategory &&
        matchesSize &&
        matchesGrade
      );
    });
  }, [allItems, search, category, subcategory, size, grade]);

  useEffect(() => {
    if (!user) {
      setLedgerEntries([]);
      return;
    }
    fetch("/api/ledger?view=org")
      .then((r) => (r.ok ? r.json() : []))
      .then((entries: LedgerEntry[]) => setLedgerEntries(entries))
      .catch(() => setLedgerEntries([]));
  }, [user]);

  const ledgerForItem = useMemo(() => {
    if (!selectedItem) return [];
    const nameLower = selectedItem.Name.toLowerCase();
    const sub = selectedItem.subcategory;
    return ledgerEntries.filter(
      (e) => e.itemName.toLowerCase() === nameLower && e.subcategory === sub
    );
  }, [selectedItem, ledgerEntries]);

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
        onCategoryChange={(c) => {
          setCategory(c);
          setSubcategory("all");
          if (c !== "Vehicle_Weaponry" && c !== "Vehicle_Components") {
            setSize("all");
            setGrade("all");
          }
        }}
        selectedSubcategory={subcategory}
        onSubcategoryChange={setSubcategory}
        selectedSize={size}
        onSizeChange={setSize}
        selectedGrade={grade}
        onGradeChange={setGrade}
        availableSizes={availableSizes}
        availableGrades={availableGrades}
        totalCount={allItems.length}
        filteredCount={filtered.length}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, i) => (
          <ItemCard
            key={`${item.Name}-${item.subcategory}-${i}`}
            item={item}
            onClick={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          ledgerEntries={ledgerForItem}
          isLoggedIn={!!user}
        />
      )}

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
