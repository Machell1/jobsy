"use client";

import { useState, useId, type ReactNode, type KeyboardEvent } from "react";

/* ─── Types ───────────────────────────────────────────────── */

export interface TabItem {
  label: string;
  value: string;
  count?: number;
  disabled?: boolean;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

/* ─── Component ───────────────────────────────────────────── */

export function Tabs({
  items,
  defaultValue,
  value: controlledValue,
  onChange,
  className = "",
}: TabsProps) {
  const baseId = useId();
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value ?? ""
  );

  const activeValue = controlledValue ?? internalValue;

  const handleSelect = (val: string) => {
    if (!controlledValue) setInternalValue(val);
    onChange?.(val);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabledItems = items.filter((i) => !i.disabled);
    const currentIndex = enabledItems.findIndex((i) => i.value === activeValue);

    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex =
        (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = enabledItems.length - 1;
    }

    if (nextIndex >= 0) {
      const next = enabledItems[nextIndex];
      handleSelect(next.value);
      const btn = document.getElementById(tabId(next.value));
      btn?.focus();
    }
  };

  const tabId = (val: string) => `${baseId}-tab-${val}`;
  const panelId = (val: string) => `${baseId}-panel-${val}`;

  const activeItem = items.find((i) => i.value === activeValue);

  return (
    <div className={className}>
      {/* Tab list */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="flex border-b border-neutral-200 gap-0 overflow-x-auto"
      >
        {items.map((item) => {
          const isActive = item.value === activeValue;
          return (
            <button
              key={item.value}
              id={tabId(item.value)}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId(item.value)}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => handleSelect(item.value)}
              className={[
                "relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isActive
                  ? "text-brand-primary"
                  : "text-neutral-500 hover:text-neutral-700",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                {item.label}
                {item.count != null && (
                  <span
                    className={[
                      "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium",
                      isActive
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "bg-neutral-100 text-neutral-500",
                    ].join(" ")}
                  >
                    {item.count}
                  </span>
                )}
              </span>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {activeItem && (
        <div
          id={panelId(activeItem.value)}
          role="tabpanel"
          aria-labelledby={tabId(activeItem.value)}
          tabIndex={0}
          className="pt-4 focus-visible:outline-none"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
