"use client";

import { Lock, ShieldCheck } from "lucide-react";

export function SecurePaymentFooter() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-neutral-800)]">
        <Lock className="h-4 w-4 text-[var(--color-emerald)]" strokeWidth={2} />
        Secure Payment
      </div>
      <p className="text-center text-xs leading-relaxed text-[var(--color-neutral-400)]">
        Funds are held in escrow and only released when you confirm the job is
        complete. All transactions are processed securely via Stripe.
      </p>
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-neutral-400)]" strokeWidth={1.5} />
        <span className="text-xs text-[var(--color-neutral-400)]">
          Protected by Stripe
        </span>
      </div>
    </div>
  );
}
