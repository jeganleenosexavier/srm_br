import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { canAccessPerson, canModifyPerson } from '@/lib/access';

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

  const reviews = await prisma.review.findMany({
    where: { personId: id },
    include: { mentor: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(reviews);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role');
  const userId = headersList.get('x-user-id')!;
  const userPersonId = headersList.get('x-user-person-id');

  if (!(await canModifyPerson(role || '', userPersonId, id))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Use the mentor's actual personId from the JWT instead of finding "first FTE"
    let mentorPersonId: string;
    if (role === 'mentor' && userPersonId) {
      mentorPersonId = userPersonId;
    } else {
      mentorPersonId = body.mentorId || id;
    }

    const review = await prisma.review.create({
      data: {
        personId: id,
        mentorId: mentorPersonId,
        technical: body.technical ? parseFloat(body.technical) : null,
        communication: body.communication ? parseFloat(body.communication) : null,
        learningAgility: body.learningAgility ? parseFloat(body.learningAgility) : null,
        notes: body.notes || '',
        recommendation: body.recommendation || null,
      },
      include: { mentor: { select: { id: true, name: true } } },
    });

    // Log stage history if there's a recommendation that implies stage change
    if (body.recommendation === 'recommend_fte') {
      const person = await prisma.person.findUnique({ where: { id } });
      if (person && person.stage === 'mentor_review') {
        await prisma.person.update({
          where: { id },
          data: { stage: 'fte_offer' },
        });
        await prisma.stageHistory.create({
          data: { personId: id, stage: 'fte_offer', userId },
        });
      }
    }

    return NextResponse.json(review, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
