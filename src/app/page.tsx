import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { SHOWCASE_GRID, SHOWCASE_HERO } from "@/lib/demo/showcase-images";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background font-sans text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-navy)] text-sm font-bold text-[var(--brand-gold)]">
              G
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--brand-navy)]/85">GOMITA</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Studio nội thất &amp; thi công</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="app-btn-primary rounded-full px-5 py-2.5 shadow-[var(--shadow-md)]"
              >
                Vào không gian làm việc
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-[var(--brand-navy)] underline-offset-4 hover:underline"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/login"
                  className="app-btn-primary rounded-full px-5 py-2.5 shadow-[var(--shadow-md)]"
                >
                  Cổng nội bộ
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-6 sm:pt-14 sm:pb-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#8b7355]">
              Thiết kế · Thi công · Vận hành
            </p>
            <h1 className="font-display mt-3 text-4xl leading-[1.12] text-[var(--text-primary)] sm:text-5xl">
              Không gian sống và làm việc có hồn — cùng đội ngũ GOMITA
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
              Cổng nội bộ tập trung tài liệu dự án, báo giá, đào tạo và quy định. Giao diện phản ánh
              đúng DNA thương hiệu: chất liệu, ánh sáng và từng đường nét nội thất.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {session ? (
                <Link
                  href="/dashboard"
                  className="app-btn-accent inline-flex rounded-full px-6 py-3 font-semibold shadow-[var(--shadow-sm)]"
                >
                  Mở bảng điều khiển
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="app-btn-accent inline-flex rounded-full px-6 py-3 font-semibold shadow-[var(--shadow-sm)]"
                >
                  Bắt đầu đăng nhập
                </Link>
              )}
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2.5 text-xs text-[var(--text-secondary)]">
                Ảnh minh họa có thể thay bằng dự án thật của công ty
              </span>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] ring-1 ring-black/5">
            <Image
              src={SHOWCASE_HERO.src}
              alt={SHOWCASE_HERO.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--brand-navy)]/45 via-transparent to-transparent" />
            <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white drop-shadow-md">
              {SHOWCASE_HERO.alt}
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]/75 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl text-[var(--text-primary)] sm:text-3xl">Moodboard dự án</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Lưới tham chiếu trực quan — sau này có thể gắn link tới từng hợp đồng hoặc báo giá.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SHOWCASE_GRID.map((item) => (
              <article
                key={item.label}
                className="group relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-muted)] shadow-[var(--shadow-xs)] ring-1 ring-black/5"
              >
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#122033]/75 via-[#122033]/15 to-transparent opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-gold)]">
                      {item.label}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-white/95">{item.alt}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-[var(--text-muted)] sm:px-6">
        <p>
          GOMITA Internal Portal — nền tảng vận hành nội bộ. Giai đoạn tiếp theo: bổ sung tính năng
          theo từng module khi đội đồng ý thiết kế.
        </p>
      </footer>
    </div>
  );
}
