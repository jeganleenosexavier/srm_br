import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { canAccessPerson } from '@/lib/access';
import { COURSES } from '@/lib/courses';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role') || 'intern';
  const userPersonId = headersList.get('x-user-person-id');

  if (!(await canAccessPerson(role, userPersonId, id))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { personId: id },
    orderBy: { enrolledAt: 'desc' },
  });

  const courseMap = Object.fromEntries(COURSES.map((c) => [c.id, c]));

  const result = enrollments.map((e) => ({
    ...e,
    course: courseMap[e.courseId] || null,
  }));

  return NextResponse.json(result);
}
