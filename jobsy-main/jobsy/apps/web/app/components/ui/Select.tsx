"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type KeyboardEvent,
} from "react";

/* ─── Types ───────────────────────────────────────────────── */

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

/* ─── Icons ───────────────────────────────────────────────── */

function ChevronDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  error,
  searchable = false,
  multiple = false,
  disabled = false,
  className = "",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const labelId = useId();
  const errorId = useId();

  const selectedValues: string[] = Array.isArray(value)
    ? value
    : value != null
    ? [value]
    : [];

  const filteredOptions = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const displayText = multiple
    ? selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : placeholder
    : options.find((o) => o.value === selectedValues[0])?.label ?? placeholder;

  /* Close on outside click */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const next = selectedValues.includes(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue];
        onChange?.(next);
      } else {
        onChange?.(optionValue);
        setIsOpen(false);
        setSearch("");
      }
    },
    [multiple, selectedValues, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      if (highlightIndex >= 0 && filteredOptions[highlightIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightIndex].value);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          id={labelId}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={label ? labelId : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onClick={() => {
          setIsOpen((o) => !o);
          if (searchable) {
            requestAnimationFrame(() => inputRef.current?.focus());
          }
        }}
        onKeyDown={handleKeyDown}
        className={[
          "flex items-center justify-between w-full h-12 px-3 rounded-lg border bg-white text-left",
          "transition-colors cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-error" : "border-neutral-300",
          selectedValues.length === 0 ? "text-neutral-400" : "text-neutral-900",
        ].join(" ")}
      >
        <span className="truncate text-base">{displayText}</span>
        <ChevronDown />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden"
          role="presentation"
        >
          {searchable && (
            <div className="p-2 border-b border-neutral-100">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full h-9 px-2 text-sm rounded border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                aria-label="Search options"
              />
            </div>
          )}

          <ul
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple}
            className="max-h-60 overflow-y-auto py-1"
          >
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-400">
                No options found
              </li>
            )}
            {filteredOptions.map((option, index) => {
              const isSelected = selectedValues.includes(option.value);
              const isHighlighted = index === highlightIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  onClick={() => {
                    if (!option.disabled) handleSelect(option.value);
                  }}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={[
                    "flex items-center justify-between px-3 py-2 text-sm cursor-pointer",
                    "transition-colors",
                    option.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "",
                    isHighlighted ? "bg-neutral-100" : "",
                    isSelected
                      ? "text-brand-primary font-medium"
                      : "text-neutral-700",
                  ].join(" ")}
                >
                  <span>{option.label}</span>
                  {isSelected && <CheckIcon />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
