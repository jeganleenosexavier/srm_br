import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { STAGES, STAGE_LABELS } from '@/lib/constants';

export async function GET(request: Request) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');
  const personId = headersList.get('x-user-person-id');

  if (role === 'intern') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');

  const where: Record<string, unknown> = {};
  if (region) where.region = region;

  // Mentor: scope to assigned interns only
  if (role === 'mentor' && personId) {
    where.mentorId = personId;
  }

  const people = await prisma.person.findMany({ where, select: { stage: true, region: true } });

  const stageCounts = STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage] || stage,
    count: people.filter((p) => p.stage === stage).length,
  }));

  const totalEntered = people.length;
  const fteHired = people.filter((p) => p.stage === 'fte_hired').length;
  const conversionRate = totalEntered > 0 ? Math.round((fteHired / totalEntered) * 100) : 0;

  const regions = [...new Set(people.map((p) => p.region))].sort();
  const byRegion = regions.map((r) => {
    const regionPeople = people.filter((p) => p.region === r);
    const regionHired = regionPeople.filter((p) => p.stage === 'fte_hired').length;
    return {
      region: r,
      total: regionPeople.length,
      hired: regionHired,
      conversionRate: regionPeople.length > 0 ? Math.round((regionHired / regionPeople.length) * 100) : 0,
    };
  });

  return NextResponse.json({
    stageCounts,
    totalEntered,
    fteHired,
    conversionRate,
    byRegion,
  });
}
