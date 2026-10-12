"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema, type LoginInput } from "@/schemas";
import { Shield, AtSign, KeyRound, Eye, EyeOff, ArrowRight, Check } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberWorkstation, setRememberWorkstation] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "sadini.wanniarachchi@sebsaworld.com",
      password: "emp123",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      setLoading(false);

      if (!json.success) {
        setServerError(json.error ?? "Login failed. Please verify credentials.");
        return;
      }

      // Route based on role
      if (json.data.role === "admin") {
        router.push("/admin/tracker");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setLoading(false);
      setServerError("Network error. Please try again.");
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#f8f9fe] via-[#f2efff] to-[#edf0ff] text-gray-800 relative overflow-hidden">
      {/* Decorative subtle ambient lights */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-indigo-300/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-[430px] bg-white/95 backdrop-blur-xl rounded-[28px] shadow-[0_20px_50px_-15px_rgba(92,76,244,0.12)] border border-purple-100/80 p-8 sm:p-10 relative z-10 transition-all">
        {/* Top Badge Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#5c4cf4] to-[#7f56d9] flex items-center justify-center shadow-lg shadow-purple-500/25 text-white">
            <Shield className="w-7 h-7" strokeWidth={2.2} />
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#5c4cf4]">SEBSA</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Internal Assessment Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Email Address */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-gray-700">
                Email Address
              </label>
              <span className="text-[11px] font-semibold text-[#5c4cf4] bg-purple-50 px-2 py-0.5 rounded-md">
                Corporate SSO
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                placeholder="name@sebsaworld.com"
                className="w-full pl-10 pr-4 py-3 bg-white text-gray-900 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#5c4cf4] focus:ring-4 focus:ring-[#5c4cf4]/10 transition"
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-gray-700">
                Password
              </label>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); alert("Please contact SEBSA IT Support (it-support@sebsaworld.com) to reset credentials."); }}
                className="text-[11px] font-medium text-[#5c4cf4] hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                placeholder="••••••••••••••••"
                className="w-full pl-10 pr-11 py-3 bg-white text-gray-900 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#5c4cf4] focus:ring-4 focus:ring-[#5c4cf4]/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Workstation Checkbox */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setRememberWorkstation(!rememberWorkstation)}
              className={`w-4 h-4 rounded flex items-center justify-center transition border ${
                rememberWorkstation
                  ? "bg-[#5c4cf4] border-[#5c4cf4] text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              {rememberWorkstation && <Check className="w-3 h-3" strokeWidth={3} />}
            </button>
            <label
              onClick={() => setRememberWorkstation(!rememberWorkstation)}
              className="ml-2.5 text-xs text-gray-600 font-medium cursor-pointer select-none"
            >
              Remember workstation
            </label>
          </div>

          {/* Error Message */}
          {serverError && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 font-medium animate-shake">
              {serverError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#5c4cf4] hover:bg-[#4c3be6] active:bg-[#4131d2] text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition duration-150 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authenticating...
              </span>
            ) : (
              <>
                Log In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing Badges */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2">
          <span className="text-[11px] text-gray-400 font-medium text-center">Quick Demo Switch:</span>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => handleQuickFill("sadini.wanniarachchi@sebsaworld.com", "emp123")}
              className="text-[11px] bg-purple-50 hover:bg-purple-100 text-[#5c4cf4] px-2.5 py-1 rounded-lg font-medium transition"
            >
              Employee: Sadini
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("admin@sebsaworld.com", "admin123")}
              className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Admin: System
            </button>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <footer className="mt-8 text-center text-xs text-gray-400">
        © SEBSA (Pvt) Ltd. All corporate assessment data encrypted.
      </footer>
    </main>
  );
}
