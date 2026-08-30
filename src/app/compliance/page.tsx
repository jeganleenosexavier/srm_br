'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CountrySummary {
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

const PIE_COLORS = { green: '#10b981', amber: '#f59e0b', red: '#ef4444' };

export default function ComplianceOverviewPage() {
  const [summaries, setSummaries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/compliance')
      .then((r) => r.json())
      .then((data) => { setSummaries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  const totalPeople = summaries.reduce((s, c) => s + c.totalPeople, 0);
  const totalGreen = summaries.reduce((s, c) => s + c.green, 0);
  const totalAmber = summaries.reduce((s, c) => s + c.amber, 0);
  const totalRed = summaries.reduce((s, c) => s + c.red, 0);
  const totalAlerts = summaries.reduce((s, c) => s + c.alertCount, 0);
  const globalCompliance = totalPeople > 0 ? Math.round((totalGreen / totalPeople) * 100) : 100;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Compliance Overview</h2>

      {/* Global summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Global Compliance</p>
            <p className="text-3xl font-bold text-gray-800">{globalCompliance}%</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{totalGreen}</div>
              <div className="text-xs text-gray-500">Green</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{totalAmber}</div>
              <div className="text-xs text-gray-500">Amber</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{totalRed}</div>
              <div className="text-xs text-gray-500">Red</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{totalAlerts}</div>
              <div className="text-xs text-gray-500">Alerts</div>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
          {totalPeople > 0 && (
            <>
              <div className="bg-emerald-500 h-full" style={{ width: `${(totalGreen / totalPeople) * 100}%` }} />
              <div className="bg-amber-500 h-full" style={{ width: `${(totalAmber / totalPeople) * 100}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${(totalRed / totalPeople) * 100}%` }} />
            </>
          )}
        </div>
      </div>

      {/* Country cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((c) => {
          const pieData = [
            { name: 'Green', value: c.green, color: PIE_COLORS.green },
            { name: 'Amber', value: c.amber, color: PIE_COLORS.amber },
            { name: 'Red', value: c.red, color: PIE_COLORS.red },
          ].filter((d) => d.value > 0);

          return (
            <div
              key={c.countryCode}
              onClick={() => router.push(`/compliance/alerts?country=${c.countryCode}`)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{c.flag}</span>
                    <h3 className="text-lg font-semibold text-gray-800">{c.countryName}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{c.totalPeople} people</p>
                </div>
                <div className="w-16 h-16">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={18} outerRadius={30} strokeWidth={0}>
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => [String(value), 'People']} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>
                  )}
                </div>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex mb-2">
                {c.totalPeople > 0 && (
                  <>
                    <div className="bg-emerald-500 h-full" style={{ width: `${(c.green / c.totalPeople) * 100}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${(c.amber / c.totalPeople) * 100}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${(c.red / c.totalPeople) * 100}%` }} />
                  </>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{c.compliancePercent}% compliant</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-medium">{c.green}</span>
                  <span className="text-amber-500 font-medium">{c.amber}</span>
                  <span className="text-red-500 font-medium">{c.red}</span>
                </div>
              </div>

              {c.alertCount > 0 && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  {c.alertCount} alert{c.alertCount > 1 ? 's' : ''} (next 90 days)
                </div>
              )}

              <div className="mt-2 text-[10px] text-gray-400">
                {c.currency} · {c.timezone}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
