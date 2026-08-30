import { prisma } from '@/lib/prisma';
import { COUNTRIES } from '@/lib/constants';

export interface ComplianceBadge {
  level: 'green' | 'amber' | 'red';
  reasons: string[];
}

export interface CountrySummary {
  countryCode: string;
  countryName: string;
  flag: string;
  currency: string;
  timezone: string;
  benefitsSummary: string;
  totalPeople: number;
  green: number;
  amber: number;
  red: number;
  compliancePercent: number;
  alertCount: number;
}

export interface ComplianceAlert {
  id: string;
  personId: string;
  personName: string;
  region: string;
  itemType: string;
  status: string;
  expiryDate: string;
  daysRemaining: number;
  urgency: '30' | '60' | '90';
}

const COMPLIANCE_TYPE_LABELS: Record<string, string> = {
  contract: 'Employment Contract',
  id_verification: 'ID Verification',
  tax_form: 'Tax Form',
  work_authorization: 'Work Authorization',
  gdpr_consent: 'GDPR Consent',
};

export function getComplianceTypeLabel(type: string): string {
  return COMPLIANCE_TYPE_LABELS[type] || type;
}

export function calculateBadge(
  items: { itemType: string; status: string; expiryDate: Date | null }[]
): ComplianceBadge {
  const reasons: string[] = [];
  let level: 'green' | 'amber' | 'red' = 'green';
  const now = Date.now();
  const DAY = 86400000;

  for (const item of items) {
    const label = getComplianceTypeLabel(item.itemType);

    if (item.status === 'expired') {
      level = 'red';
      reasons.push(`${label} expired`);
      continue;
    }

    if (item.itemType === 'gdpr_consent' && item.status !== 'complete') {
      level = 'red';
      reasons.push('GDPR consent missing');
      continue;
    }

    if (item.status === 'pending') {
      if (level !== 'red') level = 'amber';
      reasons.push(`${label} pending`);
      continue;
    }

    if (item.expiryDate) {
      const daysUntil = Math.floor((new Date(item.expiryDate).getTime() - now) / DAY);
      if (daysUntil <= 0) {
        level = 'red';
        reasons.push(`${label} expired`);
      } else if (daysUntil <= 30) {
        level = 'red';
        reasons.push(`${label} expires in ${daysUntil} days`);
      } else if (daysUntil <= 90) {
        if (level !== 'red') level = 'amber';
        reasons.push(`${label} expires in ${daysUntil} days`);
      }
    }
  }

  return { level, reasons };
}

export async function getCountrySummaries(): Promise<CountrySummary[]> {
  const countries = await prisma.country.findMany();
  const people = await prisma.person.findMany({
    include: { complianceItems: true },
  });

  return countries.map((country) => {
    const countryPeople = people.filter((p) => p.region === country.code);
    let green = 0;
    let amber = 0;
    let red = 0;
    let alertCount = 0;
    const now = Date.now();
    const DAY = 86400000;

    for (const person of countryPeople) {
      const badge = calculateBadge(person.complianceItems);
      if (badge.level === 'green') green++;
      else if (badge.level === 'amber') amber++;
      else red++;

      for (const item of person.complianceItems) {
        if (item.expiryDate) {
          const daysUntil = Math.floor((new Date(item.expiryDate).getTime() - now) / DAY);
          if (daysUntil > 0 && daysUntil <= 90) alertCount++;
        }
        if (item.status === 'pending' || item.status === 'expired') alertCount++;
      }
    }

    const meta = COUNTRIES.find((c) => c.code === country.code);
    const total = countryPeople.length;

    return {
      countryCode: country.code,
      countryName: country.name,
      flag: meta?.flag || '',
      currency: country.currency,
      timezone: country.timezone,
      benefitsSummary: country.benefitsSummary || '',
      totalPeople: total,
      green,
      amber,
      red,
      compliancePercent: total > 0 ? Math.round((green / total) * 100) : 100,
      alertCount,
    };
  });
}

export async function getAlerts(filters?: {
  country?: string;
  type?: string;
  urgency?: string;
}): Promise<ComplianceAlert[]> {
  const people = await prisma.person.findMany({
    where: filters?.country ? { region: filters.country } : undefined,
    include: { complianceItems: true },
  });

  const now = Date.now();
  const DAY = 86400000;
  const alerts: ComplianceAlert[] = [];

  for (const person of people) {
    for (const item of person.complianceItems) {
      let shouldInclude = false;
      let daysRemaining = Infinity;
      let urgency: '30' | '60' | '90' = '90';

      if (item.expiryDate) {
        daysRemaining = Math.floor((new Date(item.expiryDate).getTime() - now) / DAY);
        if (daysRemaining > 0 && daysRemaining <= 90) {
          shouldInclude = true;
          urgency = daysRemaining <= 30 ? '30' : daysRemaining <= 60 ? '60' : '90';
        } else if (daysRemaining <= 0) {
          shouldInclude = true;
          urgency = '30';
          daysRemaining = daysRemaining;
        }
      }

      if (item.status === 'pending' || item.status === 'expired') {
        shouldInclude = true;
        if (daysRemaining === Infinity) daysRemaining = 0;
        urgency = item.status === 'expired' ? '30' : '60';
      }

      if (!shouldInclude) continue;
      if (filters?.type && item.itemType !== filters.type) continue;
      if (filters?.urgency && urgency !== filters.urgency) continue;

      alerts.push({
        id: item.id,
        personId: person.id,
        personName: person.name,
        region: person.region,
        itemType: item.itemType,
        status: item.status,
        expiryDate: item.expiryDate?.toISOString() || '',
        daysRemaining,
        urgency,
      });
    }
  }

  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return alerts;
}
