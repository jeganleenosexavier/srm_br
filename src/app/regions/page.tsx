'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import { STAGE_LABELS } from '@/lib/constants';

interface RegionSummary {
  code: string;
  name: string;
  flag: string;
  hubRole: string;
  totalPeople: number;
  interns: number;
  ftes: number;
  compliance: { green: number; amber: number; red: number };
  topSkills: { name: string; count: number }[];
  stageDistribution: Record<string, number>;
}

export default function RegionsPage() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/regions')
      .then((r) => r.json())
      .then((data) => { setRegions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Regions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {regions.map((r) => (
          <div
            key={r.code}
            onClick={() => router.push(`/regions/${r.code}`)}
            className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{r.flag}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{r.name}</h3>
                <span className="text-xs text-gray-500">{r.hubRole}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{r.totalPeople}</p>
                <p className="text-[10px] text-gray-500 uppercase">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{r.interns}</p>
                <p className="text-[10px] text-gray-500 uppercase">Interns</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-purple-600">{r.ftes}</p>
                <p className="text-[10px] text-gray-500 uppercase">FTE</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <StatusBadge level="green" label={`${r.compliance.green}`} size="sm" />
              <StatusBadge level="amber" label={`${r.compliance.amber}`} size="sm" />
              <StatusBadge level="red" label={`${r.compliance.red}`} size="sm" />
            </div>

            {r.topSkills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {r.topSkills.slice(0, 3).map((s) => (
                  <span key={s.name} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {s.name} ({s.count})
                  </span>
                ))}
              </div>
            )}

            {Object.keys(r.stageDistribution).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex gap-1 h-4">
                  {Object.entries(r.stageDistribution).map(([stage, count]) => (
                    <div
                      key={stage}
                      className="bg-[#1e3a5f]/70 rounded-sm relative group"
                      style={{ flex: count }}
                      title={`${STAGE_LABELS[stage] || stage}: ${count}`}
                    >
                      <span className="invisible group-hover:visible absolute -top-6 left-0 text-[9px] bg-gray-800 text-white px-1 py-0.5 rounded whitespace-nowrap z-10">
                        {STAGE_LABELS[stage] || stage}: {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
