import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { COURSES } from '@/lib/courses';

export async function GET() {
  const headersList = await headers();
  const userPersonId = headersList.get('x-user-person-id');

  let enrollments: { courseId: string; status: string; progress: number }[] = [];
  if (userPersonId) {
    enrollments = await prisma.enrollment.findMany({
      where: { personId: userPersonId },
      select: { courseId: true, status: true, progress: true },
    });
  }

  const enrollmentMap = Object.fromEntries(
    enrollments.map((e) => [e.courseId, { status: e.status, progress: e.progress }])
  );

  const courses = COURSES.map((c) => ({
    ...c,
    enrollment: enrollmentMap[c.id] || null,
  }));

  return NextResponse.json(courses);
}
