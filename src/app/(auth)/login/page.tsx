"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

import { LOGIN_SIDE_IMAGE } from "@/lib/demo/showcase-images";

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
    <div className="flex min-h-screen flex-col bg-[var(--background)] lg:flex-row">
      <div className="relative h-52 shrink-0 lg:h-auto lg:w-[46%] lg:max-w-none">
        <Image
          src={LOGIN_SIDE_IMAGE.src}
          alt={LOGIN_SIDE_IMAGE.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 46vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-navy)]/82 via-[var(--brand-navy)]/28 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[var(--brand-navy)]/18 lg:to-[var(--brand-navy)]/48" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white lg:bottom-auto lg:top-1/2 lg:right-8 lg:left-8 lg:-translate-y-1/2 lg:p-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--brand-gold)]">GOMITA</p>
          <h1 className="font-display mt-2 max-w-md text-2xl font-semibold leading-tight lg:text-3xl">
            Cổng nội bộ cho đội thiết kế &amp; thi công
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/85">
            Đào tạo, tài liệu dự án, báo giá và quy định — tập trung một nơi.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md space-y-5">
          <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] lg:hidden">
            Đăng nhập
          </p>
          <form onSubmit={onSubmit} className="app-card space-y-4 p-6 shadow-[var(--shadow-md)]">
            <div className="rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-gradient-end)] px-4 py-3.5 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-white/75">Internal Portal</p>
              <h2 className="font-display mt-1 text-xl font-semibold">Đăng nhập an toàn</h2>
              <p className="mt-1 text-xs text-white/80">Dành cho nhân sự vận hành GOMITA.</p>
            </div>

            <div>
              <label className="app-field-label">Email</label>
              <input
                className="app-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="app-field-label">Mật khẩu</label>
              <input
                type="password"
                className="app-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <p className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={loading} className="app-btn-primary w-full py-2.5">
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>

            <div className="rounded-[var(--radius-md)] border border-[#e8dcc8] bg-[var(--brand-gold-muted)] px-3 py-2 text-xs text-[#5c4a32]">
              Demo: admin@gomita.local / Admin@123456
            </div>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)]">
            <Link href="/" className="app-link font-medium">
              ← Về trang giới thiệu
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
