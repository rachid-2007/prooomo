"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, User, Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, Package } from "lucide-react";

type Tab = "admin" | "worker";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/[...nextauth]?action=signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }

      if (tab === "worker" && data.user.role !== "WORKER") {
        setError("هذا الحساب ليس حساب عامل");
        setLoading(false);
        return;
      }

      if (tab === "admin" && data.user.role !== "ADMIN") {
        setError("هذا الحساب ليس حساب مدير");
        setLoading(false);
        return;
      }

      if (data.user.role === "WORKER" && data.user.username) {
        router.push(`/worker/${data.user.username}`);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      setError("حدث خطأ أثناء تسجيل الدخول");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-4">
            <Package className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">MEGA.MARKET</h1>
          <p className="text-gray-400 text-sm mt-1">نظام إدارة المتجر</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-800/50 rounded-2xl p-1.5 mb-6 border border-gray-700/50">
          <button
            onClick={() => switchTab("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              tab === "admin"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Shield className="h-4 w-4" />
           مدير
          </button>
          <button
            onClick={() => switchTab("worker")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              tab === "worker"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            عامل
          </button>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 ${
              tab === "admin"
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-blue-500/10 border border-blue-500/20"
            }`}>
              {tab === "admin" ? (
                <Shield className="h-7 w-7 text-emerald-400" />
              ) : (
                <User className="h-7 w-7 text-blue-400" />
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              {tab === "admin" ? "دخول المدير" : "دخول العامل"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {tab === "admin"
                ? "ادخل بياناتك للوصول للوحة التحكم"
                : "ادخل بياناتك لعرض طلباتك"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">!</span>
                </div>
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  dir="ltr"
                  className="h-12 bg-gray-900/50 border-gray-600/50 text-white placeholder:text-gray-500 pr-10 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  dir="ltr"
                  className="h-12 bg-gray-900/50 border-gray-600/50 text-white placeholder:text-gray-500 pr-10 pl-10 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-xl font-bold text-white transition-all duration-300 ${
                tab === "admin"
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25"
                  : "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25"
              }`}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {tab === "admin" ? <Shield className="h-4 w-4 ml-2" /> : <User className="h-4 w-4 ml-2" />}
                  تسجيل الدخول
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          جميع الحقوق محفوظة &copy; MEGA.MARKET
        </p>
      </div>
    </div>
  );
}
