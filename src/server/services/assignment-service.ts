import { AssignmentTargetType, NotificationType, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listAssignmentsForCourse(courseId: string) {
  return prisma.courseAssignment.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    include: {
      targetUser: { select: { id: true, fullName: true, email: true } },
      targetRole: { select: { id: true, name: true, code: true } },
      targetDepartment: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function getAssignmentFormOptions() {
  const [users, roles, departments] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, status: { not: UserStatus.TERMINATED } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
      take: 500,
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);
  return { users, roles, departments };
}

async function resolveRecipientUserIdsForAssignment(params: {
  targetType: AssignmentTargetType;
  targetUserId: string | null;
  targetRoleId: string | null;
  targetDepartmentId: string | null;
  targetPosition: string | null;
}): Promise<string[]> {
  if (params.targetType === "USER") {
    if (!params.targetUserId) return [];
    const u = await prisma.user.findFirst({
      where: {
        id: params.targetUserId,
        isActive: true,
        status: { not: UserStatus.TERMINATED },
      },
      select: { id: true },
    });
    return u ? [u.id] : [];
  }

  if (params.targetType === "ROLE") {
    if (!params.targetRoleId) return [];
    const rows = await prisma.userRole.findMany({
      where: { roleId: params.targetRoleId },
      select: { userId: true },
    });
    const ids = [...new Set(rows.map((r) => r.userId))];
    const active = await prisma.user.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        status: { not: UserStatus.TERMINATED },
      },
      select: { id: true },
    });
    return active.map((u) => u.id);
  }

  if (params.targetType === "DEPARTMENT") {
    if (!params.targetDepartmentId) return [];
    const users = await prisma.user.findMany({
      where: {
        departmentId: params.targetDepartmentId,
        isActive: true,
        status: { not: UserStatus.TERMINATED },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (params.targetType === "POSITION") {
    const code = params.targetPosition?.trim();
    if (!code) return [];
    const users = await prisma.user.findMany({
      where: {
        positionCode: code,
        isActive: true,
        status: { not: UserStatus.TERMINATED },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  return [];
}

export async function createCourseAssignment(input: {
  courseId: string;
  targetType: AssignmentTargetType;
  targetUserId?: string | null;
  targetRoleId?: string | null;
  targetDepartmentId?: string | null;
  targetPosition?: string | null;
  dueAt?: Date | null;
}) {
  const data = {
    courseId: input.courseId,
    targetType: input.targetType,
    targetUserId: input.targetType === "USER" ? input.targetUserId ?? null : null,
    targetRoleId: input.targetType === "ROLE" ? input.targetRoleId ?? null : null,
    targetDepartmentId: input.targetType === "DEPARTMENT" ? input.targetDepartmentId ?? null : null,
    targetPosition: input.targetType === "POSITION" ? (input.targetPosition?.trim() || null) : null,
    dueAt: input.dueAt ?? null,
  };

  const assignment = await prisma.courseAssignment.create({ data });

  const recipientIds = await resolveRecipientUserIdsForAssignment({
    targetType: data.targetType,
    targetUserId: data.targetUserId,
    targetRoleId: data.targetRoleId,
    targetDepartmentId: data.targetDepartmentId,
    targetPosition: data.targetPosition,
  });

  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { title: true },
  });
  const title = course?.title ?? "Course";

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type: NotificationType.TRAINING_ASSIGNED,
        title: "New training assigned",
        message: `You have been assigned: ${title}`,
        route: `/training/courses/${input.courseId}`,
        metadata: { courseId: input.courseId, assignmentId: assignment.id },
      })),
    });
  }

  return { assignment, notifiedCount: recipientIds.length };
}

export async function deleteCourseAssignment(assignmentId: string, courseId: string) {
  const row = await prisma.courseAssignment.findFirst({
    where: { id: assignmentId, courseId },
  });
  if (!row) return false;
  await prisma.courseAssignment.delete({ where: { id: assignmentId } });
  return true;
}

export type AssignedCourseRow = {
  courseId: string;
  title: string;
  slug: string;
  dueAt: Date | null;
  assignmentCount: number;
};

export async function getAssignedPublishedCoursesForUser(userId: string): Promise<AssignedCourseRow[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user || !user.isActive || user.status === UserStatus.TERMINATED) return [];

  const roleIds = user.roles.map((r) => r.roleId);

  const assignments = await prisma.courseAssignment.findMany({
    where: {
      OR: [
        { targetType: "USER", targetUserId: userId },
        ...(roleIds.length ? [{ targetType: "ROLE" as const, targetRoleId: { in: roleIds } }] : []),
        ...(user.departmentId
          ? [{ targetType: "DEPARTMENT" as const, targetDepartmentId: user.departmentId }]
          : []),
        ...(user.positionCode?.trim()
          ? [{ targetType: "POSITION" as const, targetPosition: user.positionCode.trim() }]
          : []),
      ],
    },
    include: {
      course: { select: { id: true, title: true, slug: true, isPublished: true } },
    },
  });

  const byCourse = new Map<
    string,
    { title: string; slug: string; dueDates: (Date | null)[]; count: number }
  >();

  for (const a of assignments) {
    if (!a.course.isPublished) continue;
    const cid = a.course.id;
    const existing = byCourse.get(cid);
    const due = a.dueAt;
    if (existing) {
      existing.dueDates.push(due);
      existing.count += 1;
    } else {
      byCourse.set(cid, {
        title: a.course.title,
        slug: a.course.slug,
        dueDates: [due],
        count: 1,
      });
    }
  }

  const now = new Date();
  const rows: AssignedCourseRow[] = [];
  for (const [courseId, v] of byCourse) {
    const withDue = v.dueDates.filter((d): d is Date => d != null);
    const future = withDue.filter((d) => d >= now);
    const chosen =
      future.length > 0 ? future.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b)) : withDue[0] ?? null;

    rows.push({
      courseId,
      title: v.title,
      slug: v.slug,
      dueAt: chosen,
      assignmentCount: v.count,
    });
  }

  rows.sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.title.localeCompare(b.title);
  });

  return rows;
}
