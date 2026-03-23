"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost, ApiError } from "@/lib/api";

const PASSWORD_CHECKS = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  {
    label: "Special character",
    test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p),
  },
];

function isPasswordValid(p: string) {
  return PASSWORD_CHECKS.every((c) => c.test(p));
}

const ACCOUNT_TYPES = [
  { value: "individual" as const, label: "Individual" },
  { value: "organization" as const, label: "Organization" },
  { value: "school" as const, label: "School" },
];

const ROLES = [
  { value: "customer" as const, label: "Hire services" },
  { value: "provider" as const, label: "Offer services" },
  { value: "advertiser" as const, label: "Advertise" },
];

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    display_name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer" as string,
    account_type: "individual" as string,
    org_name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.display_name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!form.phone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    if (!isPasswordValid(form.password)) {
      setError("Password does not meet all requirements");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.account_type !== "individual" && !form.org_name.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        display_name: form.display_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        role: form.role,
        account_type: form.account_type,
      };
      if (form.account_type !== "individual") {
        body.org_name = form.org_name.trim();
      }

      const res = await apiPost<{ access_token?: string }>(
        "/auth/register",
        body,
      );
      if (typeof window !== "undefined" && res.access_token) {
        document.cookie = `jobsy_token=${res.access_token};path=/;max-age=86400;SameSite=Lax`;
      }
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail ?? "Registration failed");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-neutral-900">
              Create Account
            </h1>
            <p className="mt-1 text-neutral-500">
              Join Jamaica&apos;s premier service marketplace
            </p>
          </div>

          {error && (
            <div
              className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {ACCOUNT_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("account_type", value)}
                    className={`rounded-lg border py-3 text-sm font-medium transition ${
                      form.account_type === value
                        ? "border-brand-primary bg-brand-primary/5 text-brand-primary ring-2 ring-brand-primary/20"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Org name (conditional) */}
            {form.account_type !== "individual" && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <label
                  htmlFor="org_name"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  {form.account_type === "school" ? "School" : "Organization"}{" "}
                  Name <span className="text-error">*</span>
                </label>
                <input
                  id="org_name"
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update("org_name", e.target.value)}
                  placeholder={
                    form.account_type === "school"
                      ? "School name"
                      : "Organization name"
                  }
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            )}

            {/* Full name */}
            <div>
              <label
                htmlFor="display_name"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Full Name
              </label>
              <input
                id="display_name"
                type="text"
                value={form.display_name}
                onChange={(e) => update("display_name", e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                autoComplete="name"
              />
            </div>

            {/* Phone */}
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
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+1876XXXXXXX"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                autoComplete="tel"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Email{" "}
                <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                autoComplete="email"
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                I want to
              </label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("role", value)}
                    className={`rounded-lg border px-2 py-3 text-sm font-medium transition ${
                      form.role === value
                        ? "border-brand-primary bg-brand-primary/5 text-brand-primary ring-2 ring-brand-primary/20"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-neutral-300 px-4 py-3 pr-12 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "\u{1F441}" : "\u{1F441}\u{200D}\u{1F5E8}"}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 space-y-1">
                  {PASSWORD_CHECKS.map((check) => (
                    <div key={check.label} className="flex items-center gap-1.5">
                      <span
                        className={
                          check.test(form.password)
                            ? "text-success"
                            : "text-neutral-300"
                        }
                      >
                        {check.test(form.password) ? "\u2713" : "\u2022"}
                      </span>
                      <span
                        className={`text-xs ${
                          check.test(form.password)
                            ? "text-success"
                            : "text-neutral-400"
                        }`}
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                autoComplete="new-password"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading || (!!form.password && !isPasswordValid(form.password))
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-sm text-neutral-400">or continue with</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {/* OAuth */}
          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-black bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-900"
            >
              Continue with Apple
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
