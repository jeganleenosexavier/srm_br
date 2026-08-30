import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      mentor: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, domain: true, region: true } },
      skills: { include: { skill: true } },
      reviewsReceived: {
        include: { mentor: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      },
      complianceItems: true,
      stageHistories: {
        include: { user: { select: { email: true } } },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  return NextResponse.json(person);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role !== 'admin' && role !== 'mentor') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, type, region, mentorId, projectId, riskLevel } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (type !== undefined) data.type = type;
    if (region !== undefined) data.region = region;
    if (mentorId !== undefined) data.mentorId = mentorId || null;
    if (projectId !== undefined) data.projectId = projectId || null;
    if (riskLevel !== undefined) data.riskLevel = riskLevel;

    const person = await prisma.person.update({
      where: { id },
      data,
      include: {
        mentor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(person);
  } catch {
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    await prisma.person.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}
