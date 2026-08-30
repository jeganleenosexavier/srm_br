'use client';

import { COUNTRIES, PERSON_TYPES, STAGES, STAGE_LABELS, RISK_LEVELS } from '@/lib/constants';

export interface Filters {
  region: string;
  type: string;
  stage: string;
  risk: string;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  showStage?: boolean;
  showRisk?: boolean;
}

export default function FilterBar({ filters, onChange, showStage = true, showRisk = true }: FilterBarProps) {
  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none';

  return (
    <div className="flex flex-wrap gap-2">
      <select value={filters.region} onChange={(e) => update('region', e.target.value)} className={selectClass}>
        <option value="">All Regions</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
        ))}
      </select>

      <select value={filters.type} onChange={(e) => update('type', e.target.value)} className={selectClass}>
        <option value="">All Types</option>
        {PERSON_TYPES.map((t) => (
          <option key={t} value={t}>{t === 'fte' ? 'FTE' : 'Intern'}</option>
        ))}
      </select>

      {showStage && (
        <select value={filters.stage} onChange={(e) => update('stage', e.target.value)} className={selectClass}>
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
      )}

      {showRisk && (
        <select value={filters.risk} onChange={(e) => update('risk', e.target.value)} className={selectClass}>
          <option value="">All Risk</option>
          {RISK_LEVELS.map((r) => (
            <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      )}

      {(filters.region || filters.type || filters.stage || filters.risk) && (
        <button
          onClick={() => onChange({ region: '', type: '', stage: '', risk: '' })}
          className="text-sm text-gray-500 hover:text-gray-700 px-2"
        >
          Clear
        </button>
      )}
    </div>
  );
}
