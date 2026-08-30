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

export async function GET() {
  const countries = await prisma.country.findMany();
  const people = await prisma.person.findMany({
    include: {
      skills: { include: { skill: true } },
      complianceItems: true,
    },
  });

  const regions = countries.map((country) => {
    const countryPeople = people.filter((p) => p.region === country.code);
    const meta = COUNTRIES.find((c) => c.code === country.code);

    const interns = countryPeople.filter((p) => p.type === 'intern').length;
    const ftes = countryPeople.filter((p) => p.type === 'fte').length;

    // Compliance breakdown
    let green = 0, amber = 0, red = 0;
    for (const p of countryPeople) {
      const badge = calculateBadge(p.complianceItems);
      if (badge.level === 'green') green++;
      else if (badge.level === 'amber') amber++;
      else red++;
    }

    // Top skills
    const skillCounts = new Map<string, number>();
    for (const p of countryPeople) {
      for (const ps of p.skills) {
        skillCounts.set(ps.skill.name, (skillCounts.get(ps.skill.name) || 0) + 1);
      }
    }
    const topSkills = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Stage distribution
    const stageDistribution: Record<string, number> = {};
    for (const p of countryPeople) {
      stageDistribution[p.stage] = (stageDistribution[p.stage] || 0) + 1;
    }

    return {
      code: country.code,
      name: country.name,
      flag: meta?.flag || '',
      currency: country.currency,
      timezone: country.timezone,
      benefitsSummary: country.benefitsSummary,
      hubRole: HUB_ROLES[country.code] || 'Satellite',
      overlapHoursRecommended: country.overlapHoursRecommended,
      playbookUrl: country.playbookUrl,
      totalPeople: countryPeople.length,
      interns,
      ftes,
      compliance: { green, amber, red },
      topSkills,
      stageDistribution,
    };
  });

  return NextResponse.json(regions);
}
