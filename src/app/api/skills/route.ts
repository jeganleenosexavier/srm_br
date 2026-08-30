import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const where: Record<string, unknown> = {};
  if (category) where.category = category;

  const skills = await prisma.skill.findMany({
    where,
    include: { personSkills: { select: { id: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json(
    skills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      demandLevel: s.demandLevel,
      assignedCount: s.personSkills.length,
    }))
  );
}
