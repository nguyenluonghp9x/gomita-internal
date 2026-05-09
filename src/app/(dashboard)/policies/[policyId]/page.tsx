import Link from "next/link";
import { notFound } from "next/navigation";

import { PolicyAckForm } from "@/app/(dashboard)/policies/policy-ack-form";
import {
  AddPolicyVersionForm,
  PublishDraftForm,
  UpdateDraftForm,
} from "@/app/(dashboard)/policies/policy-management-forms";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  getPolicyWithVersions,
  hasUserAcknowledgedVersion,
} from "@/server/services/policy-service";

export default async function PolicyDetailPage({ params }: { params: Promise<{ policyId: string }> }) {
  const user = await requirePermission("policies.view");
  const { policyId } = await params;

  const policy = await getPolicyWithVersions(policyId);
  if (!policy) notFound();

  const [canUpdate, canAck] = await Promise.all([
    hasPermission(user.id, "policies.update"),
    hasPermission(user.id, "policies.ack"),
  ]);
  const canSeeDraft = canUpdate;

  if (policy.status === "DRAFT" && !canSeeDraft) {
    notFound();
  }

  const latestVersion = policy.versions.find((v) => v.versionNo === policy.latestVersionNo);
  if (!latestVersion) notFound();

  const acked = await hasUserAcknowledgedVersion(user.id, policy.id, policy.latestVersionNo);
  const showAck = policy.status === "PUBLISHED" && canAck && !acked;
  const isDraft = policy.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/policies" className="text-sm text-slate-600 hover:text-slate-900">
          Back to policies
        </Link>
      </div>

      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{policy.title}</h1>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
            {policy.status}
          </span>
          <span className="text-sm text-slate-500">v{policy.latestVersionNo}</span>
        </div>
        {policy.issuingAuthority ? (
          <p className="text-sm text-slate-600">Issued by: {policy.issuingAuthority}</p>
        ) : null}
      </header>

      {showAck ? <PolicyAckForm policyId={policy.id} versionNo={policy.latestVersionNo} /> : null}

      {policy.status === "PUBLISHED" && canAck && acked ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          You have acknowledged version {policy.latestVersionNo}.
        </p>
      ) : null}

      <article className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500">Current text</h2>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
          {latestVersion.content}
        </pre>
        {latestVersion.effectiveAt ? (
          <p className="mt-4 text-xs text-slate-500">
            Effective {new Date(latestVersion.effectiveAt).toLocaleDateString()} · Updated by{" "}
            {latestVersion.updatedBy.fullName}
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-500">Updated by {latestVersion.updatedBy.fullName}</p>
        )}
      </article>

      {isDraft && canUpdate ? (
        <div className="space-y-4">
          <UpdateDraftForm policyId={policy.id} defaultContent={latestVersion.content} />
          <PublishDraftForm policyId={policy.id} />
        </div>
      ) : null}

      {!isDraft && canUpdate ? (
        <AddPolicyVersionForm policyId={policy.id} currentVersionNo={policy.latestVersionNo} />
      ) : null}

      {policy.versions.length > 1 ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Version history</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {policy.versions.map((v) => (
              <li key={v.id}>
                v{v.versionNo} · {v.updatedBy.fullName} · {new Date(v.createdAt).toLocaleString()}
                {v.versionNo === policy.latestVersionNo ? (
                  <span className="ml-2 text-xs text-emerald-700">current</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
