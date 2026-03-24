"use client";

import { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

type AuthTab = "create" | "signin";

export function InlineAuth() {
  const [tab, setTab] = useState<AuthTab>("create");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex rounded-[10px] bg-[#18191B] p-1">
        <button
          onClick={() => setTab("create")}
          className={`flex-1 rounded-[8px] px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "create"
              ? "bg-[#6366F1] text-white"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Create account
        </button>
        <button
          onClick={() => setTab("signin")}
          className={`flex-1 rounded-[8px] px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "signin"
              ? "bg-[#6366F1] text-white"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Sign in
        </button>
      </div>

      {/* Forms */}
      <div className="mt-5 space-y-3">
        {tab === "create" ? (
          <>
            {/* Name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Full name"
                className="w-full rounded-[10px] border border-[#2A2B2D] bg-[#111213] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-[10px] border border-[#2A2B2D] bg-[#111213] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
              <input
                type="tel"
                placeholder="Phone number"
                className="w-full rounded-[10px] border border-[#2A2B2D] bg-[#111213] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full rounded-[10px] border border-[#2A2B2D] bg-[#111213] py-3 pl-10 pr-10 text-sm text-white placeholder-white/30 transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Submit */}
            <button className="btn-press flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#6366F1] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5]">
              Create account
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            {/* Email/Phone */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
              <input
                type="email"
                placeholder="Email or phone number"
                className="w-full rounded-[10px] border border-[#2A2B2D] bg-[#111213] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full rounded-[10px] border border-[#2A2B2D] bg-[#111213] py-3 pl-10 pr-10 text-sm text-white placeholder-white/30 transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Submit */}
            <button className="btn-press flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#6366F1] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5]">
              Sign in
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>

            {/* Forgot password */}
            <div className="text-center">
              <button className="text-sm text-[#6366F1] hover:text-[#4F46E5] transition-colors">
                Forgot password?
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
