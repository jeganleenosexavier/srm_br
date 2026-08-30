import { prisma } from '@/lib/prisma';
import { calculateBadge } from '@/services/compliance.service';

export interface RiskSignal {
  id: string;
  name: string;
  weight: 'high' | 'medium' | 'low';
  triggered: boolean;
  detail: string;
}

export interface RiskResult {
  personId: string;
  level: 'green' | 'amber' | 'red';
  signalCount: number;
  signals: RiskSignal[];
}

const DAY = 86400000;

export async function calculateRisk(personId: string): Promise<RiskResult> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      skills: true,
      reviewsReceived: { orderBy: { date: 'desc' }, take: 1 },
      complianceItems: true,
      stageHistories: { orderBy: { timestamp: 'desc' }, take: 1 },
      project: true,
    },
  });

  if (!person) throw new Error('Person not found');

  const now = Date.now();
  const signals: RiskSignal[] = [];

  // 1. Skill stagnation — no PersonSkill updated within 90 days
  const latestSkillUpdate = person.skills.length > 0
    ? Math.max(...person.skills.map((s) => new Date(s.lastUpdated).getTime()))
    : 0;
  const skillDaysAgo = latestSkillUpdate > 0 ? Math.floor((now - latestSkillUpdate) / DAY) : Infinity;
  signals.push({
    id: 'skill_stagnation',
    name: 'Skill stagnation',
    weight: 'high',
    triggered: person.skills.length === 0 || skillDaysAgo > 90,
    detail: person.skills.length === 0
      ? 'No skills assigned'
      : `Last skill update: ${skillDaysAgo} days ago`,
  });

  // 2. No mentor review — at project+ stage with no review in 30 days
  const advancedStages = ['project', 'mentor_review', 'fte_offer', 'fte_hired'];
  const isAdvanced = advancedStages.includes(person.stage);
  const latestReview = person.reviewsReceived[0];
  const reviewDaysAgo = latestReview
    ? Math.floor((now - new Date(latestReview.date).getTime()) / DAY)
    : Infinity;
  signals.push({
    id: 'no_review',
    name: 'No recent mentor review',
    weight: 'high',
    triggered: isAdvanced && reviewDaysAgo > 30,
    detail: isAdvanced
      ? (latestReview ? `Last review: ${reviewDaysAgo} days ago` : 'No reviews on record')
      : 'Not at advanced stage yet',
  });

  // 3. Stage stuck — current stage > 45 days
  const latestStageEntry = person.stageHistories[0];
  const stageDaysAgo = latestStageEntry
    ? Math.floor((now - new Date(latestStageEntry.timestamp).getTime()) / DAY)
    : 0;
  signals.push({
    id: 'stage_stuck',
    name: 'Stage stuck',
    weight: 'medium',
    triggered: stageDaysAgo > 45,
    detail: `In current stage for ${stageDaysAgo} days`,
  });

  // 4. Compliance friction — badge is Amber or Red
  const compBadge = calculateBadge(person.complianceItems);
  signals.push({
    id: 'compliance_friction',
    name: 'Compliance friction',
    weight: 'medium',
    triggered: compBadge.level !== 'green',
    detail: compBadge.level === 'green'
      ? 'All compliance items green'
      : `Compliance: ${compBadge.level} — ${compBadge.reasons.join(', ')}`,
  });

  // 5. Low scorecard — avg of latest review scores < 3.0
  let lowScorecard = false;
  let scorecardDetail = 'No reviews to score';
  if (latestReview) {
    const scores = [latestReview.technical, latestReview.communication, latestReview.learningAgility]
      .filter((s): s is number => s !== null);
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      lowScorecard = avg < 3.0;
      scorecardDetail = `Average score: ${avg.toFixed(1)}/5`;
    }
  }
  signals.push({
    id: 'low_scorecard',
    name: 'Low scorecard',
    weight: 'medium',
    triggered: lowScorecard,
    detail: scorecardDetail,
  });

  // 6. Timezone strain — person region vs project region < 2hr overlap
  const TIMEZONE_OFFSETS: Record<string, number> = {
    SG: 8, UK: 0, IN: 5.5, LK: 5.5, ZA: 2,
  };
  let tzStrain = false;
  let tzDetail = 'No project assigned';
  if (person.project) {
    const personOffset = TIMEZONE_OFFSETS[person.region] ?? 0;
    const projectOffset = TIMEZONE_OFFSETS[person.project.region] ?? 0;
    const diff = Math.abs(personOffset - projectOffset);
    const overlapHours = Math.max(0, 8 - diff);
    tzStrain = overlapHours < 2;
    tzDetail = `${overlapHours}h overlap (person: ${person.region}, project: ${person.project.region})`;
  }
  signals.push({
    id: 'timezone_strain',
    name: 'Timezone strain',
    weight: 'low',
    triggered: tzStrain,
    detail: tzDetail,
  });

  const triggeredCount = signals.filter((s) => s.triggered).length;
  let level: 'green' | 'amber' | 'red';
  if (triggeredCount >= 4) level = 'red';
  else if (triggeredCount >= 2) level = 'amber';
  else level = 'green';

  return { personId, level, signalCount: triggeredCount, signals };
}

export async function recalculateAllRisks(): Promise<void> {
  const people = await prisma.person.findMany({ select: { id: true } });
  for (const person of people) {
    try {
      const result = await calculateRisk(person.id);
      await prisma.person.update({
        where: { id: person.id },
        data: { riskLevel: result.level },
      });
    } catch {
      // skip on error
    }
  }
}
