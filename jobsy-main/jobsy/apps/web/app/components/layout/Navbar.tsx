"use client";

import Link from "next/link";
import { ThemeToggle } from "../ui/ThemeToggle";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-[var(--color-neutral-200)] bg-[var(--color-warm-white)]/90 px-6 backdrop-blur-md">
      <Link href="/" className="font-display text-lg font-bold text-[var(--color-navy)]">
        Jobsy
      </Link>
      <div className="hidden items-center gap-8 md:flex">
        <Link href="/search" className="text-sm text-[var(--color-neutral-600)] hover:text-[var(--color-neutral-950)] transition-colors">Browse</Link>
        <Link href="/#how-it-works" className="text-sm text-[var(--color-neutral-600)] hover:text-[var(--color-neutral-950)] transition-colors">How it works</Link>
        <Link href="/register" className="text-sm text-[var(--color-neutral-600)] hover:text-[var(--color-neutral-950)] transition-colors">For professionals</Link>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/login" className="text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--color-neutral-950)] transition-colors">Sign in</Link>
        <Link href="/register" className="rounded-[10px] bg-[var(--color-navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-navy-hover)] transition-colors">Get started</Link>
      </div>
    </nav>
  );
}
