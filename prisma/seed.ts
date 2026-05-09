import "dotenv/config";

import bcrypt from "bcryptjs";
import {
  PrismaClient,
  UserStatus,
  EmploymentLevel,
  LessonType,
  QuotationStatus,
  NotificationType,
  AuditAction,
  PolicyStatus,
  ApprovalStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

function assertSafeToSeed() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allowProdSeed = process.env.ALLOW_PROD_SEED === "true";
  if (nodeEnv === "production" && !allowProdSeed) {
    throw new Error(
      "Refusing to run seed in production. Set ALLOW_PROD_SEED=true if this is intentional.",
    );
  }
}

const departments = [
  { code: "SALE", name: "Sale" },
  { code: "KTS", name: "KTS" },
  { code: "XUONG", name: "Xưởng" },
  { code: "THICONG", name: "Thi công" },
  { code: "KETOAN", name: "Kế toán" },
  { code: "MKT", name: "Marketing" },
  { code: "HR", name: "Nhân sự" },
  { code: "BOARD", name: "Ban giám đốc" },
];

const roles = [
  { code: "EMPLOYEE", name: "Nhân viên" },
  { code: "LEAD", name: "Tổ trưởng" },
  { code: "MANAGER", name: "Quản lý" },
  { code: "ADMIN", name: "Admin" },
  { code: "BOARD", name: "Ban giám đốc" },
];

const permissions = [
  "users.view", "users.create", "users.update", "users.delete",
  "roles.view", "roles.create", "roles.update", "roles.delete",
  "training.view", "training.create", "training.update", "training.approve",
  "documents.view", "documents.create", "documents.update", "documents.download",
  "policies.view", "policies.create", "policies.update", "policies.ack",
  "quotations.view", "quotations.create", "quotations.update", "quotations.export",
  "quotations.view_cost", "quotations.edit_formula", "quotations.approve_discount",
  "audit_logs.view", "dashboard.view", "notifications.view",
];

async function main() {
  assertSafeToSeed();
  const pwd = await bcrypt.hash("Admin@123456", 12);

  for (const d of departments) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
  }

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, isSystem: true },
      create: { ...role, isSystem: true },
    });
  }

  for (const key of permissions) {
    const [moduleName, action] = key.split(".");
    await prisma.permission.upsert({
      where: { key },
      update: { module: moduleName, action },
      create: { key, module: moduleName, action },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const roleMap = Object.fromEntries((await prisma.role.findMany()).map((r) => [r.code, r.id]));

  const policy: Record<string, string[]> = {
    EMPLOYEE: ["dashboard.view", "training.view", "documents.view", "policies.view", "policies.ack", "quotations.view", "quotations.create", "quotations.update", "notifications.view"],
    LEAD: ["dashboard.view", "training.view", "training.approve", "documents.view", "documents.download", "policies.view", "policies.ack", "quotations.view", "quotations.create", "quotations.update", "quotations.export", "notifications.view"],
    MANAGER: ["dashboard.view", "users.view", "training.view", "training.create", "training.update", "documents.view", "documents.create", "documents.update", "documents.download", "policies.view", "policies.create", "policies.update", "quotations.view", "quotations.create", "quotations.update", "quotations.export", "quotations.view_cost", "quotations.approve_discount", "audit_logs.view", "notifications.view"],
    ADMIN: permissions,
    BOARD: ["dashboard.view", "users.view", "training.view", "documents.view", "documents.download", "policies.view", "quotations.view", "quotations.export", "quotations.view_cost", "quotations.approve_discount", "audit_logs.view", "notifications.view"],
  };

  await prisma.rolePermission.deleteMany();
  for (const [code, keys] of Object.entries(policy)) {
    const roleId = roleMap[code];
    for (const key of keys) {
      const permission = allPerms.find((p) => p.key === key);
      if (!permission) continue;
      await prisma.rolePermission.create({
        data: { roleId, permissionId: permission.id },
      });
    }
  }

  const adminDept = await prisma.department.findUniqueOrThrow({ where: { code: "BOARD" } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
  const managerRole = await prisma.role.findUniqueOrThrow({ where: { code: "MANAGER" } });
  const saleDept = await prisma.department.findUniqueOrThrow({ where: { code: "SALE" } });

  const admin = await prisma.user.upsert({
    where: { email: "admin@gomita.local" },
    update: { fullName: "System Admin", passwordHash: pwd, departmentId: adminDept.id, status: UserStatus.ACTIVE, employmentLv: EmploymentLevel.ADMIN },
    create: {
      fullName: "System Admin",
      email: "admin@gomita.local",
      passwordHash: pwd,
      phoneNumber: "0900000000",
      title: "Administrator",
      status: UserStatus.ACTIVE,
      employmentLv: EmploymentLevel.ADMIN,
      departmentId: adminDept.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager.sale@gomita.local" },
    update: {},
    create: {
      fullName: "Sale Manager",
      email: "manager.sale@gomita.local",
      passwordHash: pwd,
      departmentId: saleDept.id,
      status: UserStatus.ACTIVE,
      employmentLv: EmploymentLevel.MANAGER,
      title: "Trưởng phòng Sale",
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: { in: [admin.id, manager.id] } } });
  await prisma.userRole.createMany({
    data: [
      { userId: admin.id, roleId: adminRole.id },
      { userId: manager.id, roleId: managerRole.id },
    ],
  });

  await prisma.policy.upsert({
    where: { slug: "noi-quy-an-toan-ung-xu" },
    update: { title: "Nội quy an toàn & ứng xử" },
    create: {
      title: "Nội quy an toàn & ứng xử",
      slug: "noi-quy-an-toan-ung-xu",
      status: PolicyStatus.PUBLISHED,
      issuingAuthority: "Ban điều hành",
      latestVersionNo: 1,
      versions: {
        create: {
          versionNo: 1,
          content:
            "Điều 1. Phạm vi áp dụng\nÁp dụng cho toàn bộ nhân sự GOMITA.\n\n" +
            "Điều 2. Giờ làm việc\nTuân thủ lịch làm việc của phòng ban. " +
            "Mọi vắng mặt cần báo trước theo quy trình nội bộ.\n\n" +
            "Điều 3. An toàn\nSử dụng đầy đủ thiết bị bảo vệ cá nhân khi làm việc tại công trường và xưởng.",
          effectiveAt: new Date(),
          issuedAt: new Date(),
          updatedById: admin.id,
        },
      },
    },
  });

  const course = await prisma.course.upsert({
    where: { slug: "an-toan-lao-dong-co-ban" },
    update: {},
    create: {
      title: "An toàn lao động cơ bản",
      slug: "an-toan-lao-dong-co-ban",
      description: "Khóa học bắt buộc cho toàn bộ nhân sự mới.",
      topic: "Onboarding",
      isPublished: true,
    },
  });

  const courseModule = await prisma.courseModule.upsert({
    where: { id: "seed-module-1" },
    update: {},
    create: {
      id: "seed-module-1",
      courseId: course.id,
      title: "Tổng quan và quy trình",
      orderNo: 1,
    },
  });

  await prisma.lesson.upsert({
    where: { id: "seed-lesson-1" },
    update: {},
    create: {
      id: "seed-lesson-1",
      courseModuleId: courseModule.id,
      title: "Quy định an toàn tại công trường",
      type: LessonType.ARTICLE,
      content: "Nội dung bài học mẫu...",
      orderNo: 1,
      estimatedMin: 15,
    },
  });

  const seedQuiz = await prisma.quiz.upsert({
    where: { id: "seed-quiz-1" },
    update: {},
    create: {
      id: "seed-quiz-1",
      courseId: course.id,
      title: "Safety quick check",
      passScore: 70,
      maxAttempts: 3,
    },
  });
  await prisma.quizQuestion.deleteMany({ where: { quizId: seedQuiz.id } });
  await prisma.quizQuestion.create({
    data: {
      quizId: seedQuiz.id,
      type: "MULTIPLE_CHOICE",
      question: "What is required on an active construction site?",
      options: ["No PPE", "Helmet only", "Helmet and safety shoes"],
      correctAnswer: 2,
      point: 1,
      orderNo: 1,
    },
  });
  await prisma.quizQuestion.create({
    data: {
      quizId: seedQuiz.id,
      type: "SHORT_ESSAY",
      question: "List two hazards you should report to your lead.",
      options: [],
      point: 2,
      orderNo: 2,
    },
  });

  const template = await prisma.quotationTemplate.upsert({
    where: { code: "TRON_GOI" },
    update: {},
    create: {
      code: "TRON_GOI",
      name: "Thi công nội thất trọn gói",
      description: "Template mặc định cho dự án trọn gói.",
    },
  });

  const formula = await prisma.quotationFormulaConfig.upsert({
    where: { id: "seed-formula-v1" },
    update: { isActive: true },
    create: {
      id: "seed-formula-v1",
      name: "Công thức mặc định v1",
      versionNo: 1,
      isActive: true,
      changedById: admin.id,
      expressionJson: {
        expression: "materials + labor + accessories + transport + install + wastage + management + profit + vat",
        variables: ["materials", "labor", "accessories", "transport", "install", "wastage", "management", "profit", "vat"],
      },
      changeReason: "Initial setup",
    },
  });

  const quotation = await prisma.quotation.upsert({
    where: { code: "BG-2026-0001" },
    update: {},
    create: {
      code: "BG-2026-0001",
      customerName: "Công ty ABC",
      projectType: "Văn phòng",
      scope: "Nội thất 200m2",
      status: QuotationStatus.PENDING_APPROVAL,
      templateId: template.id,
      formulaConfigId: formula.id,
      createdById: manager.id,
      subtotal: "150000000",
      vatAmount: "15000000",
      totalAmount: "165000000",
      estimatedCost: "120000000",
      expectedProfit: "30000000",
      marginPercent: "0.2",
      discountPercent: "0.08",
      discountReason: "Khách hàng dự án đầu tiên",
    },
  });

  await prisma.quotationItem.createMany({
    data: [
      { quotationId: quotation.id, name: "Hạng mục bàn làm việc", quantity: "20", unit: "bộ", unitPrice: "3500000", lineTotal: "70000000", estimatedCost: "56000000", projectedProfit: "14000000" },
      { quotationId: quotation.id, name: "Hạng mục tủ hồ sơ", quantity: "10", unit: "bộ", unitPrice: "4500000", lineTotal: "45000000", estimatedCost: "36000000", projectedProfit: "9000000" },
    ],
    skipDuplicates: true,
  });

  await prisma.quotationApproval.deleteMany({ where: { quotationId: quotation.id } });
  await prisma.quotationApproval.create({
    data: {
      quotationId: quotation.id,
      requestedById: manager.id,
      discountThreshold: "0",
      requestedDiscount: "0.08",
      reason: "Khách hàng dự án đầu tiên",
      status: ApprovalStatus.PENDING,
    },
  });

  await prisma.notification.createMany({
    data: [
      { userId: manager.id, type: NotificationType.QUOTATION_APPROVAL_REQUEST, title: "Báo giá chờ duyệt", message: "BG-2026-0001 đang chờ duyệt giảm giá.", route: `/quotations/${quotation.id}` },
      { userId: admin.id, type: NotificationType.SYSTEM, title: "Seed hoàn tất", message: "Dữ liệu demo đã được khởi tạo.", route: "/dashboard" },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: AuditAction.OTHER,
      module: "system",
      resource: "seed",
      metadata: { message: "Initial system seed completed" },
    },
  });

  console.log("Seed done.");
  console.log("Admin account: admin@gomita.local / Admin@123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
