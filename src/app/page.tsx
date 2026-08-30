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
import { COUNTRIES } from '@/lib/constants';

interface DashboardData {
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
        {/* Pipeline Funnel */}
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

        {/* Regional Breakdown */}
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
        {/* Retention Trend */}
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

        {/* At-Risk Queue */}
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
