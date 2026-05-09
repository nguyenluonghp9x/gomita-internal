"use client";

import { useActionState } from "react";

import { createUserAction } from "@/app/(dashboard)/admin/users/actions";

const initialState = { ok: false, message: "" };

type Option = { id: string; name: string };

export function CreateUserForm({
  departments,
  roles,
}: {
  departments: Option[];
  roles: Option[];
}) {
  const [state, action, pending] = useActionState(createUserAction, initialState);

  return (
    <form action={action} className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Tạo người dùng mới</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input name="fullName" placeholder="Họ tên" className="rounded-md border px-3 py-2 text-sm" required />
        <input type="email" name="email" placeholder="Email" className="rounded-md border px-3 py-2 text-sm" required />
        <input type="password" name="password" placeholder="Mật khẩu" className="rounded-md border px-3 py-2 text-sm" required />
        <input name="phoneNumber" placeholder="Số điện thoại" className="rounded-md border px-3 py-2 text-sm" />
        <input name="title" placeholder="Chức danh" className="rounded-md border px-3 py-2 text-sm" />
        <select name="departmentId" className="rounded-md border px-3 py-2 text-sm" required>
          <option value="">Chọn phòng ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="roleId" className="rounded-md border px-3 py-2 text-sm" required>
          <option value="">Chọn vai trò</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {state?.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Đang tạo..." : "Tạo người dùng"}
      </button>
    </form>
  );
}
