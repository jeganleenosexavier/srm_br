'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import { STAGE_LABELS, COUNTRIES } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RegionDetail {
  code: string;
  name: string;
  flag: string;
  currency: string;
  timezone: string;
  benefitsSummary: string;
  hubRole: string;
  overlapHoursRecommended: string | null;
  playbookUrl: string | null;
  totalPeople: number;
  interns: number;
  ftes: number;
  compliance: { green: number; amber: number; red: number };
  topSkills: { name: string; count: number }[];
  stageDistribution: Record<string, number>;
  people: {
    id: string; name: string; type: string; stage: string; riskLevel: string;
    mentor: string | null; project: string | null;
  }[];
}

const TIMEZONE_OFFSETS: Record<string, { offset: number; label: string }> = {
  SG: { offset: 8, label: 'SGT (UTC+8)' },
  UK: { offset: 0, label: 'GMT (UTC+0)' },
  IN: { offset: 5.5, label: 'IST (UTC+5:30)' },
  LK: { offset: 5.5, label: 'SLST (UTC+5:30)' },
  ZA: { offset: 2, label: 'SAST (UTC+2)' },
};

const COMMUNICATION_NORMS: Record<string, string> = {
  SG: 'English (primary). Weekly governance sync with UK leadership.',
  UK: 'English. Bi-weekly sprint reviews; Monday stand-ups at 09:00 GMT.',
  IN: 'English + Hindi. Daily stand-ups; bi-weekly delivery reviews with SG/UK.',
  LK: 'English + Sinhala/Tamil. Aligned with IN cadence; shared sprint cycles.',
  ZA: 'English. Weekly check-in with SG; monthly all-hands participation.',
};

function getOverlapHours(code1: string, code2: string): number {
  const o1 = TIMEZONE_OFFSETS[code1]?.offset ?? 0;
  const o2 = TIMEZONE_OFFSETS[code2]?.offset ?? 0;
  const diff = Math.abs(o1 - o2);
  return Math.max(0, 8 - diff);
}

function getCurrentLocalTime(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return '--:--';
  }
}

export default function RegionDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [region, setRegion] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [localTime, setLocalTime] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/regions/${code}`)
      .then((r) => r.json())
      .then((data) => { setRegion(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!region) return;
    const update = () => setLocalTime(getCurrentLocalTime(region.timezone));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [region]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!region) return <div className="text-center py-12 text-gray-500">Region not found</div>;

  const stageData = Object.entries(region.stageDistribution).map(([stage, count]) => ({
    stage: STAGE_LABELS[stage] || stage,
    count,
  }));

  const otherCountries = COUNTRIES.filter((c) => c.code !== code);

  return (
    <div>
      <button onClick={() => router.push('/regions')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Regions
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{region.flag}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{region.name}</h2>
            <span className="text-sm text-gray-500">{region.hubRole}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Headcount */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Headcount</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{region.totalPeople}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{region.interns}</p>
              <p className="text-xs text-gray-500">Interns</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{region.ftes}</p>
              <p className="text-xs text-gray-500">FTE</p>
            </div>
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Compliance</h3>
          <div className="flex gap-3">
            <StatusBadge level="green" label={`${region.compliance.green} Green`} size="md" />
            <StatusBadge level="amber" label={`${region.compliance.amber} Amber`} size="md" />
            <StatusBadge level="red" label={`${region.compliance.red} Red`} size="md" />
          </div>
        </div>

        {/* Top Skills */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Skills</h3>
          {region.topSkills.length === 0 ? (
            <p className="text-sm text-gray-400">No skills data</p>
          ) : (
            <div className="space-y-1.5">
              {region.topSkills.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{s.name}</span>
                  <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Distribution */}
      {stageData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Collaboration Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Collaboration Panel</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Local Timezone</label>
              <p className="text-sm text-gray-800 mt-0.5">{region.timezone} ({TIMEZONE_OFFSETS[code]?.label})</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Current Local Time</label>
              <p className="text-xl font-mono font-bold text-[#1e3a5f] mt-0.5">{localTime}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Recommended Overlap</label>
              <p className="text-sm text-gray-700 mt-0.5">{region.overlapHoursRecommended || 'Standard business hours'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Communication Norms</label>
              <p className="text-sm text-gray-700 mt-0.5">{COMMUNICATION_NORMS[code] || 'English. Standard meeting cadence.'}</p>
            </div>
            <div>
              <a
                href={region.playbookUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[#1e3a5f] hover:underline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Async Collaboration Playbook
              </a>
            </div>
          </div>

          {/* Overlap Matrix */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Timezone Overlap (hours)</label>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-500 pb-2">Region</th>
                  <th className="text-center text-xs text-gray-500 pb-2">Overlap</th>
                </tr>
              </thead>
              <tbody>
                {otherCountries.map((c) => {
                  const hours = getOverlapHours(code, c.code);
                  return (
                    <tr key={c.code} className="border-t border-gray-100">
                      <td className="py-2 text-gray-700">{c.flag} {c.name}</td>
                      <td className="py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          hours >= 6 ? 'bg-emerald-50 text-emerald-700' :
                          hours >= 4 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {hours}h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Labour Law Reference */}
      <LabourLawSection code={code} />

      {/* People */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">People ({region.people.length})</h3>
        {region.people.length === 0 ? (
          <p className="text-sm text-gray-400">No people in this region</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 text-xs font-medium text-gray-500">Name</th>
                  <th className="pb-2 text-xs font-medium text-gray-500">Type</th>
                  <th className="pb-2 text-xs font-medium text-gray-500">Stage</th>
                  <th className="pb-2 text-xs font-medium text-gray-500">Risk</th>
                  <th className="pb-2 text-xs font-medium text-gray-500">Mentor</th>
                </tr>
              </thead>
              <tbody>
                {region.people.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/people/${p.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="py-2 font-medium text-gray-800">{p.name}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        p.type === 'intern' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {p.type === 'fte' ? 'FTE' : 'Intern'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">{STAGE_LABELS[p.stage] || p.stage}</td>
                    <td className="py-2"><StatusBadge level={p.riskLevel as 'green' | 'amber' | 'red'} /></td>
                    <td className="py-2 text-gray-500">{p.mentor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const LABOUR_LAWS: Record<string, { title: string; items: string[] }> = {
  SG: {
    title: 'Singapore Employment Act',
    items: [
      'Employment contract required for all workers',
      'CPF (Central Provident Fund) contributions mandatory',
      'Annual leave: 7 days (1st year) to 14 days (8+ years)',
      'Overtime capped at 72 hours/month for eligible workers',
      'Work permit or S Pass required for foreign employees',
      'Notice period: 1 day to 4 weeks depending on tenure',
    ],
  },
  UK: {
    title: 'UK Employment Rights Act',
    items: [
      'Written statement of employment within 2 months',
      'Auto-enrolment pension for eligible workers',
      'Statutory minimum 28 days paid leave (inc. bank holidays)',
      'National Minimum Wage compliance required',
      'Right to Work check mandatory for all employees',
      'GDPR applies to all employee data processing',
      'Statutory redundancy pay after 2+ years',
    ],
  },
  IN: {
    title: 'Indian Labour Laws',
    items: [
      'Employment contract required under Shops & Establishments Act',
      'PF (Provident Fund) registration mandatory for 20+ employees',
      'ESI health insurance for eligible salary brackets',
      'Minimum 15 days earned leave per year',
      'Gratuity payable after 5 years of continuous service',
      '240 days notice required for retrenchment (100+ workers)',
      'Maternity leave: 26 weeks (first 2 children)',
    ],
  },
  LK: {
    title: 'Sri Lanka Labour Laws',
    items: [
      'EPF (Employees Provident Fund) contributions mandatory',
      'ETF (Employees Trust Fund) contributions mandatory',
      'Minimum 14 days annual leave',
      '7 days casual leave per year',
      'Termination notice: 1–3 months depending on tenure',
      'Overtime at 1.5x rate for work beyond normal hours',
    ],
  },
  ZA: {
    title: 'South African Labour Relations Act',
    items: [
      'Written employment contract recommended (BCEA)',
      'UIF (Unemployment Insurance Fund) contributions mandatory',
      'Minimum 21 consecutive days annual leave',
      'BBBEE compliance for skills development',
      'Medical aid optional but common in IT sector',
      'Minimum notice: 1 week to 4 weeks depending on tenure',
      'CCMA dispute resolution for unfair dismissal',
    ],
  },
};

function LabourLawSection({ code }: { code: string }) {
  const law = LABOUR_LAWS[code];
  if (!law) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Labour Law Reference</h3>
      <p className="text-xs text-gray-400 mb-3">{law.title}</p>
      <ul className="space-y-1.5">
        {law.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-4 h-4 text-[#1e3a5f] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
