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
      callbackUrl: "/dashboard/dashboard",
      redirect: true,
    });

    if (result?.error) {
      setError("Sign-in failed. Please verify your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-slate-900">GOMITA Internal Sign In</h1>
        <p className="text-sm text-slate-600">Use your internal account to access the portal.</p>

        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
