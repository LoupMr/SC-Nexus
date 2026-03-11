"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, LogIn, UserPlus, KeyRound, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function LoginPage() {
  const { login, signup } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passkey, setPasskey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const err = mode === "login"
        ? await login(username, password)
        : await signup(username, password, passkey);
      if (err) { setError(err); return; }
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 chamfer-lg bg-holo/10 border border-holo/30 mb-4 shadow-[0_0_12px_rgba(92,225,230,0.3)]">
            <Shield className="w-8 h-8 text-holo drop-shadow-[0_0_8px_rgba(92,225,230,0.5)]" />
          </div>
          <h1 className="text-3xl font-bold text-space-200 mobiglas-heading tracking-[0.12em]">
            SC-<span className="text-holo glow-text">NEXUS</span>
          </h1>
          <p className="text-xs text-space-500 mt-1 mobiglas-label tracking-[0.2em]">Org Logistics Portal</p>
        </div>

        <div className="glass-card chamfer-lg p-6 border border-glass-border">
          <div className="flex mb-6 bg-space-900/60 chamfer-sm p-1">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 chamfer-sm text-sm font-medium transition-all mobiglas-label",
                mode === "login" ? "bg-holo/10 text-holo border border-holo/30 shadow-[0_0_6px_rgba(92,225,230,0.2)]" : "text-space-500 hover:text-space-300 border border-transparent"
              )}
            >
              <LogIn className="w-4 h-4" /> LOGIN
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 chamfer-sm text-sm font-medium transition-all mobiglas-label",
                mode === "signup" ? "bg-holo/10 text-holo border border-holo/30 shadow-[0_0_6px_rgba(92,225,230,0.2)]" : "text-space-500 hover:text-space-300 border border-transparent"
              )}
            >
              <UserPlus className="w-4 h-4" /> SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-space-400 mb-1.5 block mobiglas-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ENTER YOUR CALLSIGN"
                className="w-full px-3 py-2.5 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 focus:shadow-[0_0_8px_rgba(92,225,230,0.2)] transition-all mobiglas-label"
                required
              />
            </div>

            <div>
              <label className="text-xs text-space-400 mb-1.5 block mobiglas-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ENTER PASSWORD"
                  className="w-full px-3 py-2.5 pr-10 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 focus:shadow-[0_0_8px_rgba(92,225,230,0.2)] transition-all mobiglas-label"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-space-500 hover:text-space-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="text-xs text-space-400 mb-1.5 block flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Org Passkey
                </label>
                <input
                  type="text"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  className="w-full px-3 py-2.5 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 focus:shadow-[0_0_8px_rgba(92,225,230,0.2)] transition-all font-mono tracking-[0.3em] text-center tabular-nums"
                  required
                />
                <p className="text-[10px] text-space-600 mt-1">Ask your Org admin for the passkey to create an account.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 chamfer-sm bg-alert/10 border border-alert/30 text-alert text-xs mobiglas-label animate-pulse-glow-alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 chamfer-sm bg-holo/20 border border-holo/40 text-holo text-sm font-medium hover:bg-holo/30 hover:shadow-[0_0_12px_rgba(92,225,230,0.3)] transition-all disabled:opacity-50 mobiglas-label"
            >
              {submitting ? "..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
        </div>

        <Link href="/" className="flex items-center justify-center gap-2 mt-6 text-xs text-space-500 hover:text-space-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to doctrine
        </Link>
        <p className="text-center text-[10px] text-space-600 mt-3 mobiglas-label tracking-[0.2em]">
          SC-Nexus v1.0 — © LoupMr. Proprietary. All rights reserved.
        </p>
      </div>
    </div>
  );
}
