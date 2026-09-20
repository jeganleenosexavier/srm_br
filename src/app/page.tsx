'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import StatusBadge from '@/components/shared/StatusBadge';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { SkeletonGrid } from '@/components/ui/SkeletonLoader';
import { COUNTRIES, STAGE_LABELS } from '@/lib/constants';

/* ────────────────────────────── Types ────────────────────────────── */

interface AdminDashboardData {
  type: 'admin';
  kpis: {
    activeInterns: number;
    fteCount: number;
    conversionPercent: number;
    atRiskCount: number;
    complianceIssues: number;
    skillsCoverage: number;
  };
  funnel: { stage: string; count: number }[];
  regions: {
    code: string; name: string; flag: string;
    total: number; interns: number; fte: number;
    riskAmber: number; riskRed: number;
    complianceAmber: number; complianceRed: number;
  }[];
  retentionTrend: { month: string; percent: number; atRisk: number }[];
  topAtRisk: {
    id: string; name: string; region: string;
    riskLevel: string; topSignal: string;
  }[];
}

interface InternDashboardData {
  type: 'intern';
  person: {
    id: string; name: string; email: string; region: string;
    stage: string; stageLabel: string;
    stageProgress: { current: number; total: number };
    riskLevel: string; complianceStatus: string;
  };
  mentor: { id: string; name: string; email: string } | null;
  project: { id: string; name: string; domain: string } | null;
  skills: { name: string; category: string; proficiency: string }[];
  latestReviews: {
    id: string; date: string;
    technical: number | null; communication: number | null; learningAgility: number | null;
    notes: string; recommendation: string | null;
    mentor: { id: string; name: string };
  }[];
}

interface MentorDashboardData {
  type: 'mentor';
  mentor: {
    id: string; name: string; region: string;
    stage: string; stageLabel: string; complianceStatus: string;
  };
  interns: {
    id: string; name: string; region: string;
    stage: string; stageLabel: string;
    riskLevel: string; complianceStatus: string;
    project: string | null; daysSinceReview: number | null; needsReview: boolean;
  }[];
  internsNeedingReview: number;
  atRiskInterns: number;
  teamSkills: { name: string; count: number }[];
}

type DashboardData = AdminDashboardData | InternDashboardData | MentorDashboardData;

/* ────────────────────────────── Page ────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchDashboard = () => {
    setError('');
    setLoading(true);
    fetch('/api/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-5">Dashboard</h2>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-5">Dashboard</h2>
        <ErrorBanner message={error} onRetry={fetchDashboard} />
      </div>
    );
  }

  if (!data) return null;

  if (data.type === 'intern') return <InternDashboard data={data} router={router} />;
  if (data.type === 'mentor') return <MentorDashboard data={data} router={router} />;
  return <AdminDashboard data={data} router={router} />;
}

/* ────────────────────── Intern Dashboard ────────────────────── */

function InternDashboard({ data, router }: { data: InternDashboardData; router: ReturnType<typeof useRouter> }) {
  const { person, mentor, project, skills, latestReviews } = data;

  const PROFICIENCY_COLORS: Record<string, string> = {
    beginner: 'bg-gray-100 text-gray-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-purple-100 text-purple-700',
    expert: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">My Dashboard</h2>
      <p className="text-sm text-gray-500 mb-5">Welcome, {person.name}</p>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Pipeline Stage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-sm font-semibold text-gray-700">Pipeline Stage</h3>
          </div>
          <p className="text-xl font-bold text-gray-800">{person.stageLabel}</p>
          <div className="mt-2">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-[var(--primary)] h-2 rounded-full transition-all"
                style={{ width: `${(person.stageProgress.current / person.stageProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Step {person.stageProgress.current} of {person.stageProgress.total}</p>
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${person.complianceStatus === 'green' ? 'bg-green-500' : person.complianceStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <h3 className="text-sm font-semibold text-gray-700">Compliance</h3>
          </div>
          <StatusBadge level={person.complianceStatus as 'green' | 'amber' | 'red'} label={person.complianceStatus === 'green' ? 'All Complete' : 'Action Needed'} />
        </div>

        {/* Mentor */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Your Mentor</h3>
          </div>
          {mentor ? (
            <div>
              <p className="text-sm font-medium text-gray-800">{mentor.name}</p>
              <p className="text-[11px] text-gray-500">{mentor.email}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Not assigned</p>
          )}
        </div>

        {/* Project */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <h3 className="text-sm font-semibold text-gray-700">Current Project</h3>
          </div>
          {project ? (
            <div>
              <p className="text-sm font-medium text-gray-800">{project.name}</p>
              <p className="text-[11px] text-gray-500">{project.domain}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Not assigned</p>
          )}
        </div>
      </div>

      {/* Bottom: Skills + Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Skills */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Skills</h3>
          {skills.length === 0 ? (
            <p className="text-sm text-gray-400">No skills recorded yet</p>
          ) : (
            <div className="space-y-2">
              {skills.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{s.category}</span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${PROFICIENCY_COLORS[s.proficiency] || 'bg-gray-100'}`}>
                    {s.proficiency.charAt(0).toUpperCase() + s.proficiency.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Reviews */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Latest Reviews</h3>
          {latestReviews.length === 0 ? (
            <p className="text-sm text-gray-400">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {latestReviews.map((r) => (
                <div key={r.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-500">{new Date(r.date).toLocaleDateString()}</span>
                    {r.recommendation && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        r.recommendation === 'recommend_fte' ? 'bg-green-100 text-green-700' :
                        r.recommendation === 'extend' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.recommendation === 'recommend_fte' ? 'Recommend FTE' : r.recommendation === 'extend' ? 'Extend' : 'Exit'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{r.notes}</p>
                  <p className="text-[10px] text-gray-400 mt-1">by {r.mentor.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────── Mentor Dashboard ────────────────────── */

function MentorDashboard({ data, router }: { data: MentorDashboardData; router: ReturnType<typeof useRouter> }) {
  const { mentor: mentorInfo, interns, internsNeedingReview, atRiskInterns, teamSkills } = data;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Team Dashboard</h2>
      <p className="text-sm text-gray-500 mb-5">Welcome, {mentorInfo.name}</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-2 h-2 rounded-full bg-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{interns.length}</p>
          <p className="text-xs text-gray-500">Assigned Interns</p>
        </div>
        <div className={`bg-white rounded-xl border border-gray-200 p-4 ${internsNeedingReview > 0 ? 'ring-2 ring-amber-200' : ''}`}>
          <div className="w-2 h-2 rounded-full bg-amber-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{internsNeedingReview}</p>
          <p className="text-xs text-gray-500">Need Review</p>
        </div>
        <div className={`bg-white rounded-xl border border-gray-200 p-4 ${atRiskInterns > 0 ? 'ring-2 ring-red-200' : ''}`}>
          <div className="w-2 h-2 rounded-full bg-red-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{atRiskInterns}</p>
          <p className="text-xs text-gray-500">At Risk</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className={`w-2 h-2 rounded-full ${mentorInfo.complianceStatus === 'green' ? 'bg-green-500' : 'bg-amber-500'} mb-2`} />
          <StatusBadge level={mentorInfo.complianceStatus as 'green' | 'amber' | 'red'} label="Your Compliance" size="sm" />
        </div>
      </div>

      {/* Interns list + Team skills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Interns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">My Interns</h3>
            <button onClick={() => router.push('/people')} className="text-xs text-[#1e3a5f] hover:underline">
              View all
            </button>
          </div>
          {interns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No assigned interns</p>
          ) : (
            <div className="space-y-2">
              {interns.map((intern) => (
                <button
                  key={intern.id}
                  onClick={() => router.push(`/people/${intern.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left border border-gray-100"
                >
                  <StatusBadge level={intern.riskLevel as 'green' | 'amber' | 'red'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{intern.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{intern.stageLabel}</span>
                      {intern.project && <span className="text-[10px] text-gray-400">{intern.project}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {intern.needsReview && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Needs Review</span>
                    )}
                    <StatusBadge level={intern.complianceStatus as 'green' | 'amber' | 'red'} size="sm" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Skills */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Team Skills Snapshot</h3>
          {teamSkills.length === 0 ? (
            <p className="text-sm text-gray-400">No skill data</p>
          ) : (
            <div className="space-y-2">
              {teamSkills.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{s.name}</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s.count} intern{s.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────── Admin Dashboard ────────────────────── */

function AdminDashboard({ data, router }: { data: AdminDashboardData; router: ReturnType<typeof useRouter> }) {
  const kpiCards = [
    { label: 'Active Interns', value: data.kpis.activeInterns, href: '/pipeline', color: 'bg-blue-500' },
    { label: 'FTE Count', value: data.kpis.fteCount, href: '/people?type=fte', color: 'bg-purple-500' },
    { label: 'Conversion %', value: `${data.kpis.conversionPercent}%`, href: '/pipeline', color: 'bg-[#c9a84c]' },
    { label: 'At Risk', value: data.kpis.atRiskCount, href: '/people?risk=amber,red', color: 'bg-red-500', alert: data.kpis.atRiskCount > 0 },
    { label: 'Compliance Issues', value: data.kpis.complianceIssues, href: '/compliance/alerts', color: 'bg-amber-500', alert: data.kpis.complianceIssues > 0 },
    { label: 'Skills Coverage', value: `${data.kpis.skillsCoverage}%`, href: '/skills/gaps', color: 'bg-emerald-500' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Executive Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {kpiCards.map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => router.push(kpi.href)}
            className={`bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-shadow ${
              kpi.alert ? 'ring-2 ring-red-200' : ''
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${kpi.color} mb-2`} />
            <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </button>
        ))}
      </div>

      {/* Middle row: Funnel + Regional Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Funnel</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Regional Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.regions.map((r) => {
              const meta = COUNTRIES.find((c) => c.code === r.code);
              return (
                <button
                  key={r.code}
                  onClick={() => router.push(`/regions/${r.code}`)}
                  className="border border-gray-100 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-lg">{meta?.flag}</span>
                    <span className="text-sm font-medium text-gray-800">{r.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{r.total}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-gray-500 mb-1.5">
                    <span>{r.fte} FTE</span>
                    <span>{r.interns} Int</span>
                  </div>
                  <div className="flex gap-1.5">
                    {r.riskRed > 0 && <StatusBadge level="red" label={`${r.riskRed}`} size="sm" />}
                    {r.riskAmber > 0 && <StatusBadge level="amber" label={`${r.riskAmber}`} size="sm" />}
                    {r.complianceRed > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">C:{r.complianceRed}</span>
                    )}
                    {r.complianceAmber > 0 && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">C:{r.complianceAmber}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: Retention Trend + At-Risk Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Retention Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.retentionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" domain={[80, 100]} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="percent" name="Retention %" stroke="#1e3a5f" strokeWidth={2} dot={{ fill: '#1e3a5f' }} />
              <Line yAxisId="right" type="monotone" dataKey="atRisk" name="At Risk" stroke="#e53e3e" strokeWidth={2} dot={{ fill: '#e53e3e' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">At-Risk Queue</h3>
            <button
              onClick={() => router.push('/people?risk=amber,red')}
              className="text-xs text-[#1e3a5f] hover:underline"
            >
              View all
            </button>
          </div>
          {data.topAtRisk.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No at-risk people</p>
          ) : (
            <div className="space-y-2">
              {data.topAtRisk.map((p) => {
                const meta = COUNTRIES.find((c) => c.code === p.region);
                return (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/people/${p.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <StatusBadge level={p.riskLevel as 'green' | 'amber' | 'red'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{p.topSignal}</p>
                    </div>
                    <span className="text-sm flex-shrink-0">{meta?.flag}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
