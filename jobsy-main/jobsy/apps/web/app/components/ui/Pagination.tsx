"use client";

/* ─── Types ───────────────────────────────────────────────── */

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/* ─── Icons ───────────────────────────────────────────────── */

function ChevronLeft() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */

function getPageNumbers(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("ellipsis");

  pages.push(total);

  return pages;
}

/* ─── Component ───────────────────────────────────────────── */

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-between gap-4 ${className}`}
    >
      {/* Total count */}
      {totalCount != null && (
        <p className="text-sm text-neutral-500 hidden sm:block">
          {totalCount.toLocaleString()} result{totalCount !== 1 ? "s" : ""}
        </p>
      )}

      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft />
        </button>

        {/* Page numbers */}
        {pages.map((page, i) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${i}`}
                className="w-9 h-9 flex items-center justify-center text-sm text-neutral-400"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-brand-primary text-white"
                  : "text-neutral-600 hover:bg-neutral-100",
              ].join(" ")}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight />
        </button>
      </div>
    </nav>
  );
}
