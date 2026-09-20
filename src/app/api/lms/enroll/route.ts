import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { COURSES } from '@/lib/courses';

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const userPersonId = headersList.get('x-user-person-id');
  if (!userPersonId) {
    return NextResponse.json({ error: 'No person linked to account' }, { status: 403 });
  }

  const { courseId } = await req.json();
  if (!COURSES.find((c) => c.id === courseId)) {
    return NextResponse.json({ error: 'Invalid course' }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { personId_courseId: { personId: userPersonId, courseId } },
    create: { personId: userPersonId, courseId, status: 'enrolled', progress: 0 },
    update: {},
  });

  return NextResponse.json(enrollment);
}

export async function PATCH(req: NextRequest) {
  const headersList = await headers();
  const userPersonId = headersList.get('x-user-person-id');
  if (!userPersonId) {
    return NextResponse.json({ error: 'No person linked to account' }, { status: 403 });
  }

  const { courseId, progress, status } = await req.json();

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: { personId_courseId: { personId: userPersonId, courseId } },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 404 });
  }

  const updateData: { progress?: number; status?: string } = {};
  if (progress !== undefined) updateData.progress = progress;
  if (status !== undefined) updateData.status = status;

  if (progress === 100 && !status) {
    updateData.status = 'completed';
  }

  const enrollment = await prisma.enrollment.update({
    where: { personId_courseId: { personId: userPersonId, courseId } },
    data: updateData,
  });

  return NextResponse.json(enrollment);
}
