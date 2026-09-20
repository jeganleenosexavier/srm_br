import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAlerts } from '@/services/compliance.service';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');
  const userPersonId = headersList.get('x-user-person-id');

  if (role === 'intern') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || undefined;
  const type = searchParams.get('type') || undefined;
  const urgency = searchParams.get('urgency') || undefined;

  try {
    let alerts = await getAlerts({ country, type, urgency });

    // Mentor: scope to self + assigned interns
    if (role === 'mentor' && userPersonId) {
      const assignedInterns = await prisma.person.findMany({
        where: { mentorId: userPersonId },
        select: { id: true },
      });
      const allowedIds = new Set([userPersonId, ...assignedInterns.map((p) => p.id)]);
      alerts = alerts.filter((a) => allowedIds.has(a.personId));
    }

    return NextResponse.json(alerts);
  } catch {
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
  }
}
