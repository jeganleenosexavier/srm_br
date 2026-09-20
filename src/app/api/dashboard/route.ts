import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { COUNTRIES, STAGES, STAGE_LABELS } from '@/lib/constants';
import { calculateRisk } from '@/services/risk.engine';

export async function GET() {
  const headersList = await headers();
  const role = headersList.get('x-user-role');
  const userPersonId = headersList.get('x-user-person-id');

  try {
    if (role === 'intern' && userPersonId) {
      return NextResponse.json(await getInternDashboard(userPersonId));
    }

    if (role === 'mentor' && userPersonId) {
      return NextResponse.json(await getMentorDashboard(userPersonId));
    }

    return NextResponse.json(await getAdminDashboard());
  } catch (err) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}

async function getInternDashboard(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      mentor: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, domain: true } },
      skills: { include: { skill: true } },
      complianceItems: true,
      reviewsReceived: {
        include: { mentor: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        take: 3,
      },
    },
  });

  if (!person) {
    return { type: 'intern', error: 'Person not found' };
  }

  const stageIdx = STAGES.indexOf(person.stage as typeof STAGES[number]);
  const totalStages = STAGES.length;

  const skills = person.skills.map((ps) => ({
    name: ps.skill.name,
    category: ps.skill.category,
    proficiency: ps.proficiency,
  }));

  const complianceGreen = person.complianceItems.every(
    (item) => item.status === 'complete' && (!item.expiryDate || new Date(item.expiryDate).getTime() > Date.now() + 30 * 86400000)
  );

  return {
    type: 'intern',
    person: {
      id: person.id,
      name: person.name,
      email: person.email,
      region: person.region,
      stage: person.stage,
      stageLabel: STAGE_LABELS[person.stage] || person.stage,
      stageProgress: { current: stageIdx + 1, total: totalStages },
      riskLevel: person.riskLevel,
      complianceStatus: complianceGreen ? 'green' : person.complianceStatus,
    },
    mentor: person.mentor,
    project: person.project,
    skills,
    latestReviews: person.reviewsReceived.map((r) => ({
      id: r.id,
      date: r.date,
      technical: r.technical,
      communication: r.communication,
      learningAgility: r.learningAgility,
      notes: r.notes,
      recommendation: r.recommendation,
      mentor: r.mentor,
    })),
  };
}

async function getMentorDashboard(personId: string) {
  const mentorPerson = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      complianceItems: true,
      skills: { include: { skill: true } },
    },
  });

  if (!mentorPerson) {
    return { type: 'mentor', error: 'Person not found' };
  }

  const assignedInterns = await prisma.person.findMany({
    where: { mentorId: personId },
    include: {
      project: { select: { name: true } },
      complianceItems: true,
      reviewsReceived: { orderBy: { date: 'desc' }, take: 1 },
      skills: { include: { skill: true } },
    },
    orderBy: { name: 'asc' },
  });

  const internCards = assignedInterns.map((intern) => {
    const lastReview = intern.reviewsReceived[0];
    const daysSinceReview = lastReview
      ? Math.floor((Date.now() - new Date(lastReview.date).getTime()) / 86400000)
      : null;

    const complianceGreen = intern.complianceItems.every(
      (item) => item.status === 'complete' && (!item.expiryDate || new Date(item.expiryDate).getTime() > Date.now() + 30 * 86400000)
    );

    return {
      id: intern.id,
      name: intern.name,
      region: intern.region,
      stage: intern.stage,
      stageLabel: STAGE_LABELS[intern.stage] || intern.stage,
      riskLevel: intern.riskLevel,
      complianceStatus: complianceGreen ? 'green' : intern.complianceStatus,
      project: intern.project?.name || null,
      daysSinceReview,
      needsReview: daysSinceReview === null || daysSinceReview > 14,
    };
  });

  // Skill counts across interns
  const skillCounts = new Map<string, number>();
  for (const intern of assignedInterns) {
    for (const ps of intern.skills) {
      skillCounts.set(ps.skill.name, (skillCounts.get(ps.skill.name) || 0) + 1);
    }
  }
  const teamSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const mentorComplianceGreen = mentorPerson.complianceItems.every(
    (item) => item.status === 'complete' && (!item.expiryDate || new Date(item.expiryDate).getTime() > Date.now() + 30 * 86400000)
  );

  return {
    type: 'mentor',
    mentor: {
      id: mentorPerson.id,
      name: mentorPerson.name,
      region: mentorPerson.region,
      stage: mentorPerson.stage,
      stageLabel: STAGE_LABELS[mentorPerson.stage] || mentorPerson.stage,
      complianceStatus: mentorComplianceGreen ? 'green' : mentorPerson.complianceStatus,
    },
    interns: internCards,
    internsNeedingReview: internCards.filter((i) => i.needsReview).length,
    atRiskInterns: internCards.filter((i) => i.riskLevel === 'amber' || i.riskLevel === 'red').length,
    teamSkills,
  };
}

async function getAdminDashboard() {
  const people = await prisma.person.findMany({
    include: { complianceItems: true },
  });

  const activeInterns = people.filter(
    (p) => p.type === 'intern' && !['fte_hired', 'exit'].includes(p.stage)
  ).length;

  const fteCount = people.filter(
    (p) => p.type === 'fte' || p.stage === 'fte_hired'
  ).length;

  const fteHired = people.filter((p) => p.stage === 'fte_hired').length;
  const exited = people.filter((p) => p.stage === 'exit').length;
  const conversionPercent =
    fteHired + exited > 0 ? Math.round((fteHired / (fteHired + exited)) * 100) : 0;

  const atRiskCount = people.filter(
    (p) => p.riskLevel === 'amber' || p.riskLevel === 'red'
  ).length;

  const complianceIssues = people.filter(
    (p) => p.complianceStatus === 'amber' || p.complianceStatus === 'red'
  ).length;

  const roles = await prisma.role.findMany({
    include: { requiredSkills: { include: { skill: true } } },
  });
  const personSkills = await prisma.personSkill.findMany();

  let totalCoverage = 0;
  let roleCount = 0;
  const profToNum: Record<string, number> = {
    beginner: 1, intermediate: 2, advanced: 3, expert: 4,
  };

  for (const roleObj of roles) {
    if (roleObj.requiredSkills.length === 0) continue;
    let met = 0;
    for (const rs of roleObj.requiredSkills) {
      const minLevel = profToNum[rs.minimumLevel] || 1;
      const qualified = personSkills.some(
        (ps) => ps.skillId === rs.skillId && (profToNum[ps.proficiency] || 0) >= minLevel
      );
      if (qualified) met++;
    }
    totalCoverage += Math.round((met / roleObj.requiredSkills.length) * 100);
    roleCount++;
  }
  const skillsCoverage = roleCount > 0 ? Math.round(totalCoverage / roleCount) : 0;

  const funnel = STAGES.map((stage) => ({
    stage: STAGE_LABELS[stage] || stage,
    count: people.filter((p) => p.stage === stage).length,
  }));

  const regions = COUNTRIES.map((c) => {
    const rp = people.filter((p) => p.region === c.code);
    return {
      code: c.code,
      name: c.name,
      flag: c.flag,
      total: rp.length,
      interns: rp.filter((p) => p.type === 'intern').length,
      fte: rp.filter((p) => p.type === 'fte').length,
      riskAmber: rp.filter((p) => p.riskLevel === 'amber').length,
      riskRed: rp.filter((p) => p.riskLevel === 'red').length,
      complianceAmber: rp.filter((p) => p.complianceStatus === 'amber').length,
      complianceRed: rp.filter((p) => p.complianceStatus === 'red').length,
    };
  });

  const retentionTrend = [
    { month: 'Jun 2026', percent: 92, atRisk: 5 },
    { month: 'Jul 2026', percent: 95, atRisk: 3 },
    { month: 'Aug 2026', percent: Math.round(100 - (atRiskCount / Math.max(people.length, 1)) * 100), atRisk: atRiskCount },
  ];

  const atRiskPeople = people
    .filter((p) => p.riskLevel === 'amber' || p.riskLevel === 'red')
    .sort((a, b) => {
      if (a.riskLevel === 'red' && b.riskLevel !== 'red') return -1;
      if (b.riskLevel === 'red' && a.riskLevel !== 'red') return 1;
      return 0;
    })
    .slice(0, 5);

  const topAtRisk = [];
  for (const p of atRiskPeople) {
    let topSignal = 'Risk detected';
    try {
      const riskResult = await calculateRisk(p.id);
      const triggered = riskResult.signals.find((s) => s.triggered);
      if (triggered) topSignal = triggered.detail;
    } catch {
      // keep default
    }
    topAtRisk.push({
      id: p.id,
      name: p.name,
      region: p.region,
      riskLevel: p.riskLevel,
      topSignal,
    });
  }

  return {
    type: 'admin',
    kpis: { activeInterns, fteCount, conversionPercent, atRiskCount, complianceIssues, skillsCoverage },
    funnel,
    regions,
    retentionTrend,
    topAtRisk,
  };
}
