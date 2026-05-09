import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  phoneNumber: z.string().min(8).optional().or(z.literal("")),
  title: z.string().optional().or(z.literal("")),
  departmentId: z.string().min(1, "Vui lòng chọn phòng ban"),
  roleId: z.string().min(1, "Vui lòng chọn vai trò"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
