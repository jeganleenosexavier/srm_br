import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { STAGES } from '@/lib/constants';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const type = searchParams.get('type');

  const where: Record<string, unknown> = {};
  if (region) where.region = region;
  if (type) where.type = type;

  const people = await prisma.person.findMany({
    where,
    include: {
      mentor: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const grouped: Record<string, typeof people> = {};
  for (const stage of STAGES) {
    grouped[stage] = [];
  }
  for (const person of people) {
    if (grouped[person.stage]) {
      grouped[person.stage].push(person);
    }
  }

  return NextResponse.json(grouped);
}
