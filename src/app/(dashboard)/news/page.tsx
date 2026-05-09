import { requirePermission } from "@/lib/auth/session";
import { DEMO_NEWS_POSTS } from "@/lib/demo/news";

export default async function NewsPage() {
  await requirePermission("dashboard.view");

  return (
    <div className="space-y-5">
      <div className="app-card bg-gradient-to-r from-[var(--brand-navy)] to-[var(--brand-navy-gradient-end)] p-5 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/70">Internal Newsroom</p>
        <h1 className="mt-1 text-2xl font-semibold">Ban tin noi bo GOMITA</h1>
        <p className="mt-1 text-sm text-white/80">
          Noi dung demo de doi ngu test luong thong tin, bo loc va trinh bay bai viet noi bo.
        </p>
      </div>

      <div className="grid gap-4">
        {DEMO_NEWS_POSTS.map((post) => (
          <article key={post.id} className="app-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--brand-gold-muted)] px-2.5 py-1 text-xs font-medium text-[var(--brand-navy)]">
                {post.category}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(post.publishedAt).toLocaleDateString()} · {post.readMinutes} min read
              </span>
            </div>

            <h2 className="mt-3 text-xl font-semibold text-slate-900">{post.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{post.excerpt}</p>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {post.body.map((line, idx) => (
                <p key={`${post.id}-${idx}`}>{line}</p>
              ))}
            </div>

            <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              {post.author}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
