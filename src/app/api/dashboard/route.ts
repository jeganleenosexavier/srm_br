import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COUNTRIES, STAGES, STAGE_LABELS } from '@/lib/constants';
import { calculateRisk } from '@/services/risk.engine';

export async function GET() {
  try {
    const people = await prisma.person.findMany({
      include: { complianceItems: true },
    });

    // KPIs
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

    // Skills coverage — average across roles
    const roles = await prisma.role.findMany({
      include: {
        requiredSkills: { include: { skill: true } },
      },
    });
    const personSkills = await prisma.personSkill.findMany();

    let totalCoverage = 0;
    let roleCount = 0;
    const profToNum: Record<string, number> = {
      beginner: 1, intermediate: 2, advanced: 3, expert: 4,
    };

    for (const role of roles) {
      if (role.requiredSkills.length === 0) continue;
      let met = 0;
      for (const rs of role.requiredSkills) {
        const minLevel = profToNum[rs.minimumLevel] || 1;
        const qualified = personSkills.some(
          (ps) => ps.skillId === rs.skillId && (profToNum[ps.proficiency] || 0) >= minLevel
        );
        if (qualified) met++;
      }
      totalCoverage += Math.round((met / role.requiredSkills.length) * 100);
      roleCount++;
    }
    const skillsCoverage = roleCount > 0 ? Math.round(totalCoverage / roleCount) : 0;

    // Funnel
    const funnel = STAGES.map((stage) => ({
      stage: STAGE_LABELS[stage] || stage,
      count: people.filter((p) => p.stage === stage).length,
    }));

    // Regions
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

    // Retention trend (mock 3-month data based on current state)
    const retentionTrend = [
      { month: 'Jun 2026', percent: 92, atRisk: 5 },
      { month: 'Jul 2026', percent: 95, atRisk: 3 },
      { month: 'Aug 2026', percent: Math.round(100 - (atRiskCount / Math.max(people.length, 1)) * 100), atRisk: atRiskCount },
    ];

    // Top at-risk people (Red first, then Amber, limit 5)
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

    return NextResponse.json({
      kpis: { activeInterns, fteCount, conversionPercent, atRiskCount, complianceIssues, skillsCoverage },
      funnel,
      regions,
      retentionTrend,
      topAtRisk,
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
