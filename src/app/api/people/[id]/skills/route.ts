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

  const skills = await prisma.personSkill.findMany({
    where: { personId: id },
    include: { skill: true },
    orderBy: { skill: { name: 'asc' } },
  });

  return NextResponse.json(
    skills.map((ps) => ({
      id: ps.id,
      skillId: ps.skill.id,
      skillName: ps.skill.name,
      category: ps.skill.category,
      proficiency: ps.proficiency,
      lastUpdated: ps.lastUpdated,
      isStale: Date.now() - new Date(ps.lastUpdated).getTime() > 90 * 24 * 60 * 60 * 1000,
      certName: ps.certName,
      certExpiry: ps.certExpiry,
    }))
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  const userPersonId = headersList.get('x-user-person-id');

  if (!(await canModifyPerson(role || '', userPersonId, id))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === 'add' && body.skillId && body.proficiency) {
      const existing = await prisma.personSkill.findFirst({
        where: { personId: id, skillId: body.skillId },
      });
      if (existing) {
        return NextResponse.json({ error: 'Skill already assigned' }, { status: 409 });
      }
      await prisma.personSkill.create({
        data: {
          personId: id,
          skillId: body.skillId,
          proficiency: body.proficiency,
          lastUpdated: new Date(),
        },
      });
    } else if (body.action === 'update' && body.personSkillId && body.proficiency) {
      await prisma.personSkill.update({
        where: { id: body.personSkillId },
        data: { proficiency: body.proficiency, lastUpdated: new Date() },
      });
    } else if (body.action === 'update_cert' && body.personSkillId) {
      await prisma.personSkill.update({
        where: { id: body.personSkillId },
        data: {
          certName: body.certName || null,
          certExpiry: body.certExpiry ? new Date(body.certExpiry) : null,
        },
      });
    } else if (body.action === 'remove' && body.personSkillId) {
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      await prisma.personSkill.delete({ where: { id: body.personSkillId } });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update skills' }, { status: 500 });
  }
}
