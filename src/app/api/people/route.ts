import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');
  const userPersonId = headersList.get('x-user-person-id');

  if (role === 'intern') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const type = searchParams.get('type');
  const stage = searchParams.get('stage');
  const risk = searchParams.get('risk');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = {};
  if (region) where.region = region;
  if (type) where.type = type;
  if (stage) where.stage = stage;
  if (risk) where.riskLevel = risk;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  // Mentor: scope to assigned interns + self
  if (role === 'mentor' && userPersonId) {
    where.OR = [
      { mentorId: userPersonId },
      { id: userPersonId },
      ...(search ? [{ name: { contains: search } }, { email: { contains: search } }] : []),
    ];
    // If search was set via OR above, remove it to avoid conflict
    if (search) {
      where.AND = [
        { OR: [{ mentorId: userPersonId }, { id: userPersonId }] },
        { OR: [{ name: { contains: search } }, { email: { contains: search } }] },
      ];
      delete where.OR;
    }
  }

  const people = await prisma.person.findMany({
    where,
    include: {
      mentor: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(people);
}

export async function POST(request: Request) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, type, region, mentorId, projectId } = body;

    if (!name || !email || !type || !region) {
      return NextResponse.json({ error: 'Name, email, type, and region are required' }, { status: 400 });
    }

    const existing = await prisma.person.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const userId = headersList.get('x-user-id')!;

    const person = await prisma.person.create({
      data: {
        name,
        email,
        type,
        region,
        stage: 'applied',
        mentorId: mentorId || null,
        projectId: projectId || null,
      },
      include: {
        mentor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await prisma.stageHistory.create({
      data: { personId: person.id, stage: 'applied', userId },
    });

    return NextResponse.json(person, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create person' }, { status: 500 });
  }
}
