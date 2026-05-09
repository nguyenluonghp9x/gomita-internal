import { requirePermission } from "@/lib/auth/session";
import { CreateCourseForm } from "@/app/(dashboard)/training/courses/new/create-course-form";

export default async function NewCoursePage() {
  await requirePermission("training.create");

  return (
    <div className="py-4">
      <CreateCourseForm />
    </div>
  );
}
