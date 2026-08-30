import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const roles = await prisma.role.findMany({
    include: {
      requiredSkills: {
        include: { skill: true },
        orderBy: { skill: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      requiredSkills: r.requiredSkills.map((rs) => ({
        skillId: rs.skill.id,
        skillName: rs.skill.name,
        minimumLevel: rs.minimumLevel,
      })),
    }))
  );
}
