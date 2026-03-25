"use client";

/**
 * Armory URL query params (for deep links from Ship Matrix and sharing):
 * - category: Vehicle_* | Personal_Armor | Weapon_Attachments | Fpsgadgets_Utilities | Other | all (ships → /ships)
 * - subcategory: e.g. Weapons, Shields (armory subcategory id)
 * - size: numeric string e.g. "3" (ship weapon/component size)
 * - grade: e.g. "A" (when applicable)
 * - search: free-text name filter
 *
 * Example: /armory?category=Vehicle_Weaponry&subcategory=Weapons&size=3
 */

import { useMemo, useEffect, useState, useCallback, useDeferredValue } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Crosshair } from "lucide-react";
import {
  getArmoryItemPool,
  DatabaseItem,
  subcategories,
  ARMORY_OMIT_CATEGORY_IDS,
} from "@/lib/database";
import ItemCard from "@/components/ItemCard";
import ItemDetailModal from "@/components/ItemDetailModal";
import SearchFilter from "@/components/SearchFilter";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/useAuth";

/** Max cards mounted at once; rest via “Load more” (large catalogs were locking the main thread). */
const ARMORY_PAGE_SIZE = 180;

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

export default function ArmoryClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const category = searchParams.get("category") ?? "all";
  const subcategory = searchParams.get("subcategory") ?? "all";
  const size = searchParams.get("size") ?? "all";
  const grade = searchParams.get("grade") ?? "all";
  const search = searchParams.get("search") ?? "";
  const deferredSearch = useDeferredValue(search);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") p.delete(key);
        else p.set(key, value);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const pool = useMemo(() => getArmoryItemPool(category), [category]);
  const [selectedItem, setSelectedItem] = useState<DatabaseItem | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [visibleCap, setVisibleCap] = useState(ARMORY_PAGE_SIZE);

  const itemsMatchingCategory = useMemo(() => {
    return pool.filter((item) => subcategory === "all" || item.subcategory === subcategory);
  }, [pool, subcategory]);

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

  useEffect(() => {
    setVisibleCap(ARMORY_PAGE_SIZE);
  }, [search, category, subcategory, size, grade]);

  /** Drop subcategory from URL if it doesn’t belong to the selected category (bad deep links). */
  useEffect(() => {
    if (category === "all" || subcategory === "all") return;
    const meta = subcategories.find((s) => s.id === subcategory);
    if (meta && meta.category !== category) {
      setParams({ subcategory: null });
    }
  }, [category, subcategory, setParams]);

  /** Ships & vehicles use /ships — strip armory category if bookmarked. */
  useEffect(() => {
    if (!ARMORY_OMIT_CATEGORY_IDS.includes(category)) return;
    setParams({ category: null, subcategory: null });
  }, [category, setParams]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return pool.filter((item) => {
      const matchesSearch = !q || item.Name.toLowerCase().includes(q);
      const matchesSubcategory = subcategory === "all" || item.subcategory === subcategory;
      const matchesSize =
        size === "all" ||
        (typeof item.Size === "number" && String(item.Size) === size);
      const matchesGrade =
        grade === "all" ||
        (typeof item.Grade === "string" && item.Grade === grade);
      return matchesSearch && matchesSubcategory && matchesSize && matchesGrade;
    });
  }, [pool, deferredSearch, subcategory, size, grade]);

  const visibleItems = useMemo(
    () => filtered.slice(0, visibleCap),
    [filtered, visibleCap]
  );

  const searchPending = search !== deferredSearch;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/ledger?view=org")
      .then((r) => (r.ok ? r.json() : []))
      .then((entries: LedgerEntry[]) => {
        if (!cancelled) setLedgerEntries(entries);
      })
      .catch(() => {
        if (!cancelled) setLedgerEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const ledgerForItem = useMemo(() => {
    if (!selectedItem || !user) return [];
    const nameLower = selectedItem.Name.toLowerCase();
    const sub = selectedItem.subcategory;
    return ledgerEntries.filter(
      (e) => e.itemName.toLowerCase() === nameLower && e.subcategory === sub
    );
  }, [selectedItem, ledgerEntries, user]);

  return (
    <>
      <PageHeader
        icon={Crosshair}
        title="THE ARMORY"
        subtitle="Master item database — browse all tracked equipment"
      />

      <p className="text-space-500 text-xs mobiglas-label mb-2">
        <Link
          href="/ships"
          className="text-holo hover:underline"
        >
          Ship matrix
        </Link>
        <span className="text-space-600"> — hardpoint sizes link here with filters applied.</span>
      </p>

      <SearchFilter
        search={search}
        onSearchChange={(v) => setParams({ search: v || null })}
        selectedCategory={category}
        onCategoryChange={(c) =>
          setParams({
            category: c === "all" ? null : c,
            subcategory: null,
            size: null,
            grade: null,
          })
        }
        selectedSubcategory={subcategory}
        onSubcategoryChange={(s) => setParams({ subcategory: s === "all" ? null : s })}
        selectedSize={size}
        onSizeChange={(s) => setParams({ size: s === "all" ? null : s })}
        selectedGrade={grade}
        onGradeChange={(g) => setParams({ grade: g === "all" ? null : g })}
        availableSizes={availableSizes}
        availableGrades={availableGrades}
        totalCount={pool.length}
        filteredCount={filtered.length}
        onClearFilters={() =>
          setParams({
            search: null,
            category: null,
            subcategory: null,
            size: null,
            grade: null,
          })
        }
        omitCategoryIds={ARMORY_OMIT_CATEGORY_IDS}
      />

      {searchPending && (
        <p className="text-space-600 text-xs mt-2" aria-live="polite">
          Updating results…
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item, rowIndex) => (
          <ItemCard
            key={`armory-${rowIndex}-${item.category}-${item.subcategory}-${item.Name}`}
            item={item}
            onClick={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {filtered.length > visibleCap && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleCap((c) => c + ARMORY_PAGE_SIZE)}
            className="px-5 py-2.5 text-sm font-medium text-holo border border-holo/40 chamfer-md bg-holo/5 hover:bg-holo/10 mobiglas-label transition-colors"
          >
            Load more ({filtered.length - visibleCap} remaining)
          </button>
          <span className="text-space-600 text-xs">
            Showing {visibleItems.length} of {filtered.length} matches
          </span>
        </div>
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          ledgerEntries={ledgerForItem}
          isLoggedIn={!!user}
        />
      )}

      {!searchPending && filtered.length === 0 && (
        <div className="text-center py-20">
          <Crosshair className="w-12 h-12 text-space-700 mx-auto mb-3" />
          <p className="text-space-500 text-sm">No items match your search.</p>
          <p className="text-space-600 text-xs mt-1">Try adjusting your filters or search term.</p>
        </div>
      )}
    </>
  );
}
