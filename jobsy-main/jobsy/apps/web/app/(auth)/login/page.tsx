"use client";

import { useState } from "react";
import type { LoginRequest } from "@jobsy/types";
import { formatJMD } from "@jobsy/utils";

export default function LoginPage() {
  const [form, setForm] = useState<LoginRequest>({
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate phone format
    if (!/^\+1876\d{7}$/.test(form.phone)) {
      setError("Please enter a valid Jamaican phone number (+1876XXXXXXX)");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // TODO: Implement actual login API call
    console.log("Login submitted:", form.phone);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-brand-primary">Jobsy</h1>
            <p className="mt-2 text-neutral-500">
              Sign in to your account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1876XXXXXXX"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-primary px-4 py-2.5 font-semibold text-white hover:bg-blue-700 focus:ring-4 focus:ring-brand-primary/30"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-sm text-neutral-400">or</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 px-4 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 px-4 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Continue with Apple
            </button>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="font-medium text-brand-primary hover:underline"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
