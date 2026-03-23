/* ─── Types ───────────────────────────────────────────────── */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/* ─── Chevron ─────────────────────────────────────────────── */

function ChevronRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-neutral-400"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight />}

              {isLast || !item.href ? (
                <span
                  className={
                    isLast
                      ? "font-medium text-neutral-900"
                      : "text-neutral-500"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="text-neutral-500 hover:text-brand-primary transition-colors"
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
