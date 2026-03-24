"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

export function InlineAuth() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-16">
      {/* Left: Value prop */}
      <div className="lg:w-1/2">
        <h2 className="font-display text-2xl font-bold text-[#0D0D0B]">
          Join Jamaica&apos;s fastest-growing service marketplace
        </h2>
        <ul className="mt-6 space-y-4">
          {[
            "Verified providers you can trust",
            "Secure payments held until job completion",
            "Real reviews from real Jamaicans",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0A7B55]" />
              <span className="text-[#4A4A42]">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: Auth card */}
      <div className="lg:w-1/2">
        <div className="rounded-[14px] border border-[#E0DDD7] bg-white p-6 shadow-[0_2px_4px_rgb(8_9_10/0.06),0_1px_2px_rgb(8_9_10/0.04)]">
          {/* Tabs */}
          <div className="flex rounded-[10px] bg-[#F5F3EF] p-1">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-[8px] py-2.5 text-sm font-medium transition-all ${
                mode === "signup"
                  ? "bg-white text-[#0D0D0B] shadow-[0_1px_2px_rgb(8_9_10/0.04)]"
                  : "text-[#8A8A80] hover:text-[#4A4A42]"
              }`}
            >
              Create account
            </button>
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-[8px] py-2.5 text-sm font-medium transition-all ${
                mode === "signin"
                  ? "bg-white text-[#0D0D0B] shadow-[0_1px_2px_rgb(8_9_10/0.04)]"
                  : "text-[#8A8A80] hover:text-[#4A4A42]"
              }`}
            >
              Sign in
            </button>
          </div>

          {/* Form */}
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* Name field — animates in/out */}
            <div
              className="overflow-hidden transition-all duration-200"
              style={{
                maxHeight: mode === "signup" ? "56px" : "0px",
                opacity: mode === "signup" ? 1 : 0,
              }}
            >
              <input
                type="text"
                placeholder="Full name"
                className="auth-input"
                tabIndex={mode === "signup" ? 0 : -1}
              />
            </div>

            <input type="email" placeholder="Email address" className="auth-input" />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="auth-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A80] hover:text-[#4A4A42]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full rounded-[10px] bg-[#0F2556] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0A1A3D] btn-press"
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          {/* Or divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E0DDD7]" />
            <span className="text-xs text-[#8A8A80]">or</span>
            <div className="h-px flex-1 bg-[#E0DDD7]" />
          </div>

          {/* OAuth */}
          <div className="space-y-3">
            <button className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#E0DDD7] bg-white py-2.5 text-sm font-medium text-[#0D0D0B] transition-colors hover:bg-[#F5F3EF]">
              Continue with Google
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#E0DDD7] bg-white py-2.5 text-sm font-medium text-[#0D0D0B] transition-colors hover:bg-[#F5F3EF]">
              Continue with Apple
            </button>
          </div>

          {/* Terms */}
          <p className="mt-4 text-center text-xs text-[#8A8A80]">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-[#4A4A42]">Terms</a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-[#4A4A42]">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
