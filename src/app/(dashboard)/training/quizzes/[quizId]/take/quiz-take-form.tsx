"use client";

import { useState, useTransition } from "react";

import { submitQuizAttemptAction, type QuizSubmitResult } from "@/app/(dashboard)/training/quiz-actions";

type QuizQuestionField = {
  id: string;
  type: string;
  question: string;
  options: string[] | null;
  point: number;
};

export function QuizTakeForm({
  quizId,
  questions,
  canSubmit,
}: {
  quizId: string;
  questions: QuizQuestionField[];
  canSubmit: boolean;
}) {
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await submitQuizAttemptAction(fd);
          setResult(r);
        });
      }}
    >
      <input type="hidden" name="quizId" value={quizId} />
      {questions.map((q, idx) => (
        <fieldset key={q.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <legend className="text-sm font-semibold text-slate-900">
            Q{idx + 1} ({q.point} pts) · {q.type}
          </legend>
          <p className="mt-2 text-sm text-slate-800">{q.question}</p>
          {q.type === "MULTIPLE_CHOICE" && q.options && q.options.length > 0 ? (
            <div className="mt-3 space-y-2">
              {q.options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name={`q_${q.id}`} value={String(i)} className="rounded-full border" />
                  {opt}
                </label>
              ))}
            </div>
          ) : null}
          {q.type === "SHORT_ESSAY" ? (
            <textarea
              name={`q_${q.id}`}
              rows={4}
              className="mt-3 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Your answer (min ~30 chars for partial auto credit)"
            />
          ) : null}
        </fieldset>
      ))}

      {result && !result.ok ? <p className="text-sm text-rose-600">{result.message}</p> : null}
      {result && result.ok ? (
        <p className="text-sm text-emerald-800">
          Submitted attempt {result.attemptNo}. Score: {result.scorePercent}%.{" "}
          {result.passed ? "Passed." : "Below pass threshold."}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || pending || questions.length === 0}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting..." : canSubmit ? "Submit answers" : "No attempts left"}
      </button>
    </form>
  );
}
