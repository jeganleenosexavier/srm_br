'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/shared/SearchInput';
import FilterBar, { type Filters } from '@/components/shared/FilterBar';
import StatusBadge from '@/components/shared/StatusBadge';
import { STAGE_LABELS, COUNTRIES } from '@/lib/constants';

interface Person {
  id: string;
  name: string;
  email: string;
  type: string;
  region: string;
  stage: string;
  riskLevel: string;
  startDate: string;
  mentor?: { id: string; name: string } | null;
}

type SortKey = 'name' | 'type' | 'region' | 'stage' | 'mentor' | 'daysInStage' | 'risk';
type SortDir = 'asc' | 'desc';

export default function PipelineTablePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ region: '', type: '', stage: '', risk: '' });
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.region) params.set('region', filters.region);
    if (filters.type) params.set('type', filters.type);
    if (filters.stage) params.set('stage', filters.stage);
    if (filters.risk) params.set('risk', filters.risk);
    if (search) params.set('search', search);

    const res = await fetch(`/api/people?${params}`);
    if (res.ok) setPeople(await res.json());
    setLoading(false);
  }, [filters, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const daysInStage = (p: Person) => {
    const start = new Date(p.startDate).getTime();
    return Math.floor((Date.now() - start) / 86400000);
  };

  const sorted = useMemo(() => {
    const arr = [...people];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'region': cmp = a.region.localeCompare(b.region); break;
        case 'stage': cmp = a.stage.localeCompare(b.stage); break;
        case 'mentor': cmp = (a.mentor?.name || '').localeCompare(b.mentor?.name || ''); break;
        case 'daysInStage': cmp = daysInStage(a) - daysInStage(b); break;
        case 'risk': cmp = a.riskLevel.localeCompare(b.riskLevel); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [people, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => toggleSort(field)}
      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-800 select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          <svg className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </span>
    </th>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Pipeline Table</h2>
          <button
            onClick={() => router.push('/pipeline')}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2.5 py-1 rounded-lg"
          >
            Kanban View
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No people found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortHeader label="Name" field="name" />
                  <SortHeader label="Type" field="type" />
                  <SortHeader label="Region" field="region" />
                  <SortHeader label="Stage" field="stage" />
                  <SortHeader label="Mentor" field="mentor" />
                  <SortHeader label="Days" field="daysInStage" />
                  <SortHeader label="Risk" field="risk" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const country = COUNTRIES.find((c) => c.code === p.region);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/people/${p.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.type === 'intern' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {p.type === 'fte' ? 'FTE' : 'Intern'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{country?.flag} {country?.code}</td>
                      <td className="px-4 py-3 text-gray-600">{STAGE_LABELS[p.stage] || p.stage}</td>
                      <td className="px-4 py-3 text-gray-500">{p.mentor?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{daysInStage(p)}</td>
                      <td className="px-4 py-3"><StatusBadge level={p.riskLevel as 'green' | 'amber' | 'red'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
            {sorted.length} {sorted.length === 1 ? 'person' : 'people'}
          </div>
        </div>
      )}
    </div>
  );
}
