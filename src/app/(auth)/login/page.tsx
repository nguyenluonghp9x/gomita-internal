"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@gomita.local");
  const [password, setPassword] = useState("Admin@123456");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: true,
    });

    if (result?.error) {
      setError("Sign-in failed. Please verify your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_16px_45px_rgba(17,29,46,0.14)]"
      >
        <div className="rounded-xl bg-[#20344c] px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-white/75">GOMITA</p>
          <h1 className="mt-1 text-xl font-semibold">Internal Portal</h1>
          <p className="mt-1 text-xs text-white/80">Secure sign-in for operations, training and quotations.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-[#20344c]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-[#20344c]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-[#20344c] px-3 py-2 text-white transition hover:bg-[#182b40] disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
