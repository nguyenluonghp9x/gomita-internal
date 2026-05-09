"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { completeLessonAction } from "@/app/(dashboard)/training/actions";

export function CompleteLessonButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await completeLessonAction(lessonId);
          if (res && "ok" in res && res.ok) router.refresh();
        })
      }
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Saving..." : "Mark as completed"}
    </button>
  );
}
