import { LessonType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils/slug";

export async function listCoursesForManagement() {
  return prisma.course.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
    },
  });
}

export async function listPublishedCourses() {
  return prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { title: "asc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
    },
  });
}

export async function getCourseById(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { orderNo: "asc" },
        include: {
          lessons: { orderBy: { orderNo: "asc" } },
        },
      },
      quizzes: { orderBy: { title: "asc" } },
    },
  });
}

export async function countLessonsInCourse(courseId: string): Promise<number> {
  return prisma.lesson.count({
    where: { courseModule: { courseId } },
  });
}

export async function getEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: {
      lessons: true,
    },
  });
}

export async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (await prisma.course.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createCourse(data: {
  title: string;
  description?: string | null;
  topic?: string | null;
  isPublished?: boolean;
}) {
  const base = slugify(data.title);
  const slug = await ensureUniqueSlug(base);
  return prisma.course.create({
    data: {
      title: data.title.trim(),
      slug,
      description: data.description?.trim() || null,
      topic: data.topic?.trim() || null,
      isPublished: data.isPublished ?? false,
    },
  });
}

export async function updateCoursePublish(courseId: string, isPublished: boolean) {
  return prisma.course.update({
    where: { id: courseId },
    data: { isPublished },
  });
}

export async function addModule(courseId: string, title: string) {
  const max = await prisma.courseModule.aggregate({
    where: { courseId },
    _max: { orderNo: true },
  });
  const orderNo = (max._max.orderNo ?? 0) + 1;
  return prisma.courseModule.create({
    data: { courseId, title: title.trim(), orderNo },
  });
}

export async function addLesson(
  courseModuleId: string,
  data: {
    title: string;
    type: LessonType;
    content?: string | null;
    mediaUrl?: string | null;
    downloadable?: boolean;
    estimatedMin?: number | null;
  },
) {
  const max = await prisma.lesson.aggregate({
    where: { courseModuleId },
    _max: { orderNo: true },
  });
  const orderNo = (max._max.orderNo ?? 0) + 1;
  return prisma.lesson.create({
    data: {
      courseModuleId,
      title: data.title.trim(),
      type: data.type,
      content: data.content?.trim() || null,
      mediaUrl: data.mediaUrl?.trim() || null,
      downloadable: data.downloadable ?? false,
      estimatedMin: data.estimatedMin ?? null,
      orderNo,
    },
  });
}

export async function startOrGetEnrollment(
  userId: string,
  courseId: string,
): Promise<{ ok: true; enrollmentId: string } | { ok: false; message: string }> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { ok: false, message: "Course not found" };
  if (!course.isPublished) return { ok: false, message: "Course is not published yet" };

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return { ok: true, enrollmentId: existing.id };

  const totalLessons = await countLessonsInCourse(courseId);
  const created = await prisma.enrollment.create({
    data: {
      userId,
      courseId,
      progressPercent: totalLessons === 0 ? 100 : 0,
      completedAt: totalLessons === 0 ? new Date() : null,
    },
  });
  return { ok: true, enrollmentId: created.id };
}

export async function getLessonContext(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      courseModule: {
        include: {
          course: true,
        },
      },
    },
  });
}

async function recalcEnrollmentProgress(enrollmentId: string, courseId: string) {
  const total = await countLessonsInCourse(courseId);
  if (total === 0) {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { progressPercent: 100, completedAt: new Date(), isOverdue: false },
    });
    return;
  }
  const completed = await prisma.enrollmentLessonProgress.count({
    where: { enrollmentId, isCompleted: true },
  });
  const percent = Math.round((completed / total) * 1000) / 10;
  const done = completed >= total;
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPercent: percent,
      completedAt: done ? new Date() : null,
      isOverdue: false,
    },
  });
}

export async function markLessonCompleted(userId: string, lessonId: string) {
  const lesson = await getLessonContext(lessonId);
  if (!lesson) return { ok: false as const, message: "Lesson not found" };

  const courseId = lesson.courseModule.courseId;
  const course = lesson.courseModule.course;
  if (!course.isPublished) {
    return { ok: false as const, message: "Course is not available" };
  }

  const enroll = await startOrGetEnrollment(userId, courseId);
  if (!enroll.ok) return { ok: false as const, message: enroll.message };

  await prisma.enrollmentLessonProgress.upsert({
    where: {
      enrollmentId_lessonId: { enrollmentId: enroll.enrollmentId, lessonId },
    },
    update: { isCompleted: true, completedAt: new Date() },
    create: {
      enrollmentId: enroll.enrollmentId,
      lessonId,
      isCompleted: true,
      completedAt: new Date(),
    },
  });

  await recalcEnrollmentProgress(enroll.enrollmentId, courseId);

  return { ok: true as const, courseId };
}

export async function getUserTrainingSummary(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true, slug: true, isPublished: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return enrollments;
}

type QuizQuestionPublic = {
  id: string;
  type: string;
  question: string;
  options: string[] | null;
  point: number;
};

export async function getQuizForTaking(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { orderNo: "asc" } },
      course: { select: { id: true, isPublished: true } },
    },
  });
  if (!quiz) return null;
  const questions: QuizQuestionPublic[] = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    question: q.question,
    point: q.point,
    options: Array.isArray(q.options) ? (q.options as unknown[]).map(String) : null,
  }));
  return {
    id: quiz.id,
    courseId: quiz.courseId,
    title: quiz.title,
    passScore: quiz.passScore,
    maxAttempts: quiz.maxAttempts,
    course: quiz.course,
    questions,
  };
}

export async function getQuizForEdit(quizId: string) {
  return prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { orderNo: "asc" } },
      course: { select: { id: true, title: true, isPublished: true } },
    },
  });
}

export async function countQuizAttempts(quizId: string, userId: string) {
  return prisma.quizAttempt.count({ where: { quizId, userId } });
}

export async function listQuizAttemptsForUser(quizId: string, userId: string) {
  return prisma.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { attemptNo: "desc" },
    take: 10,
  });
}

export async function createQuiz(
  courseId: string,
  data: { title: string; passScore?: number; maxAttempts?: number },
) {
  return prisma.quiz.create({
    data: {
      courseId,
      title: data.title.trim(),
      passScore: data.passScore ?? 70,
      maxAttempts: data.maxAttempts ?? 3,
    },
  });
}

export async function addQuizMcQuestion(
  quizId: string,
  data: { question: string; options: string[]; correctIndex: number; point?: number },
) {
  const options = data.options.map((o) => o.trim()).filter((o) => o.length > 0);
  if (options.length < 2) {
    throw new Error("AT_LEAST_TWO_OPTIONS");
  }
  if (data.correctIndex < 0 || data.correctIndex >= options.length) {
    throw new Error("BAD_CORRECT_INDEX");
  }
  const max = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { orderNo: true },
  });
  const orderNo = (max._max.orderNo ?? 0) + 1;
  return prisma.quizQuestion.create({
    data: {
      quizId,
      type: "MULTIPLE_CHOICE",
      question: data.question.trim(),
      options: options as unknown as Prisma.InputJsonValue,
      correctAnswer: data.correctIndex as unknown as Prisma.InputJsonValue,
      point: data.point ?? 1,
      orderNo,
    },
  });
}

export async function addQuizEssayQuestion(quizId: string, data: { question: string; point?: number }) {
  const max = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { orderNo: true },
  });
  const orderNo = (max._max.orderNo ?? 0) + 1;
  return prisma.quizQuestion.create({
    data: {
      quizId,
      type: "SHORT_ESSAY",
      question: data.question.trim(),
      options: [] as unknown as Prisma.InputJsonValue,
      point: data.point ?? 2,
      orderNo,
    },
  });
}

function parseCorrectIndex(value: Prisma.JsonValue | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function saveQuizAttempt(
  userId: string,
  quizId: string,
  answers: Record<string, string>,
): Promise<
  | { ok: true; scorePercent: number; passed: boolean; attemptNo: number; courseId: string }
  | { ok: false; message: string }
> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { orderNo: "asc" } }, course: { select: { id: true, isPublished: true } } },
  });
  if (!quiz) return { ok: false, message: "Quiz not found" };

  if (quiz.course.isPublished) {
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.courseId } },
    });
    if (!enrolled) return { ok: false, message: "Enroll in the course before taking the quiz" };
  }

  const attemptCount = await prisma.quizAttempt.count({ where: { quizId, userId } });
  if (attemptCount >= quiz.maxAttempts) return { ok: false, message: "Maximum attempts reached" };

  let earned = 0;
  let maxPoints = 0;
  for (const q of quiz.questions) {
    maxPoints += q.point;
    if (q.type === "MULTIPLE_CHOICE") {
      const opts = Array.isArray(q.options) ? (q.options as unknown[]).map(String) : [];
      if (opts.length === 0) continue;
      const correct = parseCorrectIndex(q.correctAnswer);
      if (correct === null) continue;
      const raw = answers[q.id];
      const chosen = raw === undefined || raw === "" ? NaN : Number.parseInt(raw, 10);
      if (Number.isFinite(chosen) && chosen === correct) earned += q.point;
    } else if (q.type === "SHORT_ESSAY") {
      const text = (answers[q.id] ?? "").trim();
      if (text.length >= 30) earned += Math.round(q.point * 0.7);
    }
  }

  const scorePercent = maxPoints === 0 ? 100 : Math.min(100, Math.round((earned / maxPoints) * 100));
  const passed = scorePercent >= quiz.passScore;
  const attemptNo = attemptCount + 1;

  await prisma.quizAttempt.create({
    data: {
      quizId,
      userId,
      score: scorePercent,
      passed,
      attemptNo,
      answers: answers as Prisma.InputJsonValue,
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
  });

  return { ok: true, scorePercent, passed, attemptNo, courseId: quiz.courseId };
}
