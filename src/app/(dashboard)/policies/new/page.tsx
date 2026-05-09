import Link from "next/link";

import { CreatePolicyForm } from "@/app/(dashboard)/policies/create-policy-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewPolicyPage() {
  await requirePermission("policies.create");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/policies" className="text-sm text-slate-600 hover:text-slate-900">
          Back to policies
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create policy</h1>
        <p className="mt-1 text-sm text-slate-600">
          First version is always v1. You can publish immediately or keep as draft and publish later.
        </p>
      </div>
      <CreatePolicyForm />
    </div>
  );
}
