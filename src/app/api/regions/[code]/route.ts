import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COUNTRIES } from '@/lib/constants';
import { calculateBadge } from '@/services/compliance.service';

const HUB_ROLES: Record<string, string> = {
  SG: 'Governance (HQ)',
  UK: 'Governance',
  IN: 'Delivery (anchor)',
  LK: 'Satellite (delivery support)',
  ZA: 'Satellite',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const country = await prisma.country.findUnique({ where: { code } });
  if (!country) {
    return NextResponse.json({ error: 'Country not found' }, { status: 404 });
  }

  const people = await prisma.person.findMany({
    where: { region: code },
    include: {
      skills: { include: { skill: true } },
      complianceItems: true,
      mentor: { select: { name: true } },
      project: { select: { name: true, domain: true } },
    },
  });

  const meta = COUNTRIES.find((c) => c.code === code);

  let green = 0, amber = 0, red = 0;
  for (const p of people) {
    const badge = calculateBadge(p.complianceItems);
    if (badge.level === 'green') green++;
    else if (badge.level === 'amber') amber++;
    else red++;
  }

  const skillCounts = new Map<string, number>();
  for (const p of people) {
    for (const ps of p.skills) {
      skillCounts.set(ps.skill.name, (skillCounts.get(ps.skill.name) || 0) + 1);
    }
  }
  const topSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const stageDistribution: Record<string, number> = {};
  for (const p of people) {
    stageDistribution[p.stage] = (stageDistribution[p.stage] || 0) + 1;
  }

  return NextResponse.json({
    code: country.code,
    name: country.name,
    flag: meta?.flag || '',
    currency: country.currency,
    timezone: country.timezone,
    benefitsSummary: country.benefitsSummary,
    hubRole: HUB_ROLES[country.code] || 'Satellite',
    overlapHoursRecommended: country.overlapHoursRecommended,
    playbookUrl: country.playbookUrl,
    totalPeople: people.length,
    interns: people.filter((p) => p.type === 'intern').length,
    ftes: people.filter((p) => p.type === 'fte').length,
    compliance: { green, amber, red },
    topSkills,
    stageDistribution,
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      stage: p.stage,
      riskLevel: p.riskLevel,
      mentor: p.mentor?.name || null,
      project: p.project?.name || null,
    })),
  });
}
