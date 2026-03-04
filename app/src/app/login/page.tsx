"use client";

import { useState } from "react";
import { Shield, LogIn, UserPlus, KeyRound, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-space-black p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-holo/10 border border-holo/30 mb-4">
            <Shield className="w-8 h-8 text-holo" />
          </div>
          <h1 className="text-3xl font-bold text-space-200 tracking-tight">
            SC-<span className="text-holo glow-text">NEXUS</span>
          </h1>
          <p className="text-xs text-space-500 mt-1 uppercase tracking-widest">Org Logistics Portal</p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-glass-border">
          <div className="flex mb-6 bg-space-900/60 rounded-lg p-1">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                mode === "login" ? "bg-holo/10 text-holo border border-holo/20" : "text-space-500 hover:text-space-300 border border-transparent"
              )}
            >
              <LogIn className="w-4 h-4" /> Login
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                mode === "signup" ? "bg-holo/10 text-holo border border-holo/20" : "text-space-500 hover:text-space-300 border border-transparent"
              )}
            >
              <UserPlus className="w-4 h-4" /> Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-space-400 mb-1.5 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your callsign"
                className="w-full px-3 py-2.5 bg-space-900/60 border border-glass-border rounded-lg text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs text-space-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2.5 pr-10 bg-space-900/60 border border-glass-border rounded-lg text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 transition-all"
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
                  className="w-full px-3 py-2.5 bg-space-900/60 border border-glass-border rounded-lg text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 transition-all font-mono tracking-widest text-center"
                  required
                />
                <p className="text-[10px] text-space-600 mt-1">Ask your Org admin for the passkey to create an account.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-holo/20 border border-holo/40 text-holo rounded-lg text-sm font-medium hover:bg-holo/30 transition-all disabled:opacity-50"
            >
              {submitting ? "..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-space-600 mt-6 uppercase tracking-widest">
          SC-Nexus v1.0 — Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
