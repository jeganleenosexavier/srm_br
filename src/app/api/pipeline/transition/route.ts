import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { STAGES } from '@/lib/constants';

export async function POST(request: Request) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');
  const userId = headersList.get('x-user-id')!;

  if (role === 'intern') {
    return NextResponse.json({ error: 'Interns cannot modify pipeline' }, { status: 403 });
  }

  try {
    const { personId, newStage, exitReason } = await request.json();

    if (!personId || !newStage) {
      return NextResponse.json({ error: 'personId and newStage are required' }, { status: 400 });
    }

    if (!STAGES.includes(newStage as typeof STAGES[number])) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, stage: true, mentorId: true },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Mentors can only move their assigned people
    if (role === 'mentor') {
      const userPersonId = headersList.get('x-user-person-id');
      if (!userPersonId || person.mentorId !== userPersonId) {
        return NextResponse.json({ error: 'Mentors can only move their assigned people' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = { stage: newStage };
    if (newStage === 'exit' && exitReason) {
      updateData.exitReason = exitReason;
    }

    await prisma.person.update({
      where: { id: personId },
      data: updateData,
    });

    await prisma.stageHistory.create({
      data: { personId, stage: newStage, userId },
    });

    return NextResponse.json({ success: true, personId, newStage });
  } catch {
    return NextResponse.json({ error: 'Transition failed' }, { status: 500 });
  }
}
