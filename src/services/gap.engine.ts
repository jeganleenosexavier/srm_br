import { prisma } from '@/lib/prisma';

const PROFICIENCY_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];

function profLevel(p: string): number {
  return PROFICIENCY_ORDER.indexOf(p);
}

export interface GapDetail {
  skillId: string;
  skillName: string;
  requiredLevel: string;
  status: 'met' | 'partial' | 'missing';
  currentLevel?: string;
}

export interface GapResult {
  roleId: string;
  roleName: string;
  totalRequired: number;
  met: number;
  partial: number;
  missing: number;
  coverageScore: number;
  details: GapDetail[];
}

export interface TeamSkillCoverage {
  skillId: string;
  skillName: string;
  requiredLevel: string;
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
  total: number;
  coveragePercent: number;
}

export interface TeamGapResult {
  roleId: string;
  roleName: string;
  skills: TeamSkillCoverage[];
  overallCoverage: number;
}

export async function analyzePersonGap(personId: string, roleId: string): Promise<GapResult> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { requiredSkills: { include: { skill: true } } },
  });

  if (!role) throw new Error('Role not found');

  const personSkills = await prisma.personSkill.findMany({
    where: { personId },
    include: { skill: true },
  });

  const personSkillMap = new Map(personSkills.map((ps) => [ps.skillId, ps]));

  const details: GapDetail[] = role.requiredSkills.map((rs) => {
    const ps = personSkillMap.get(rs.skillId);
    if (!ps) {
      return { skillId: rs.skillId, skillName: rs.skill.name, requiredLevel: rs.minimumLevel, status: 'missing' as const };
    }
    const meetsLevel = profLevel(ps.proficiency) >= profLevel(rs.minimumLevel);
    return {
      skillId: rs.skillId,
      skillName: rs.skill.name,
      requiredLevel: rs.minimumLevel,
      status: meetsLevel ? 'met' as const : 'partial' as const,
      currentLevel: ps.proficiency,
    };
  });

  const met = details.filter((d) => d.status === 'met').length;
  const partial = details.filter((d) => d.status === 'partial').length;
  const missing = details.filter((d) => d.status === 'missing').length;
  const totalRequired = details.length;
  const coverageScore = totalRequired > 0 ? Math.round((met / totalRequired) * 100) : 0;

  return { roleId: role.id, roleName: role.name, totalRequired, met, partial, missing, coverageScore, details };
}

export async function analyzeTeamGap(roleId: string, region?: string): Promise<TeamGapResult> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { requiredSkills: { include: { skill: true } } },
  });

  if (!role) throw new Error('Role not found');

  const where: Record<string, unknown> = {};
  if (region) where.region = region;

  const people = await prisma.person.findMany({
    where,
    include: { skills: true },
  });

  const totalPeople = people.length;

  const skills: TeamSkillCoverage[] = role.requiredSkills.map((rs) => {
    const counts = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    let total = 0;

    for (const person of people) {
      const ps = person.skills.find((s) => s.skillId === rs.skillId);
      if (ps) {
        const prof = ps.proficiency as keyof typeof counts;
        if (counts[prof] !== undefined) counts[prof]++;
        total++;
      }
    }

    const atOrAbove = people.filter((person) => {
      const ps = person.skills.find((s) => s.skillId === rs.skillId);
      return ps && profLevel(ps.proficiency) >= profLevel(rs.minimumLevel);
    }).length;

    const coveragePercent = totalPeople > 0 ? Math.round((atOrAbove / totalPeople) * 100) : 0;

    return {
      skillId: rs.skillId,
      skillName: rs.skill.name,
      requiredLevel: rs.minimumLevel,
      ...counts,
      total,
      coveragePercent,
    };
  });

  const overallCoverage = skills.length > 0
    ? Math.round(skills.reduce((sum, s) => sum + s.coveragePercent, 0) / skills.length)
    : 0;

  return { roleId: role.id, roleName: role.name, skills, overallCoverage };
}
