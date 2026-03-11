"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import clsx from "clsx";

export interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, label: string) => void;
  placeholder?: string;
  className?: string;
}

export default function Combobox({ options, value, onChange, placeholder = "Search...", className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const groups = Array.from(new Set(filtered.map((o) => o.group).filter(Boolean))) as string[];
  const ungrouped = filtered.filter((o) => !o.group);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: ComboboxOption) => {
    onChange(opt.value, opt.label);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    setQuery("");
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 px-3 py-2 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-left focus:outline-none focus:border-holo/40 focus:shadow-[0_0_8px_rgba(92,225,230,0.2)] transition-all mobiglas-label"
      >
        <span className={clsx("flex-1 truncate", value ? "text-space-200" : "text-space-600")}>
          {selectedLabel || placeholder}
        </span>
        {value ? (
          <X className="w-3.5 h-3.5 text-space-500 hover:text-space-300 flex-shrink-0" onClick={handleClear} />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-space-500 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full chamfer-md bg-[rgba(0,15,30,0.95)] backdrop-blur-xl border border-glass-border shadow-[0_0_12px_rgba(92,225,230,0.15)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-glass-border">
            <Search className="w-3.5 h-3.5 text-space-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="flex-1 bg-transparent text-sm text-space-200 placeholder:text-space-600 focus:outline-none"
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-space-500">No results found</div>
            )}

            {ungrouped.length > 0 && ungrouped.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={clsx(
                  "w-full text-left px-3 py-2 text-sm transition-colors mobiglas-label",
                  opt.value === value
                    ? "bg-holo/10 text-holo"
                    : "text-space-300 hover:bg-space-800/60 hover:text-space-200"
                )}
              >
                {opt.label}
              </button>
            ))}

            {groups.map((group) => (
              <div key={group}>
                <div className="px-3 py-1.5 text-[10px] font-medium text-space-500 mobiglas-label bg-space-900/80 sticky top-0">
                  {group}
                </div>
                {filtered.filter((o) => o.group === group).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={clsx(
                      "w-full text-left px-3 py-2 text-sm transition-colors mobiglas-label",
                      opt.value === value
                        ? "bg-holo/10 text-holo"
                        : "text-space-300 hover:bg-space-800/60 hover:text-space-200"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
