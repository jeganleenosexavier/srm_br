'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COUNTRIES, SKILL_CATEGORIES, PROFICIENCY_LABELS } from '@/lib/constants';

interface Person {
  id: string;
  name: string;
  type: string;
  region: string;
  skills: { skillId: string; proficiency: string; lastUpdated: string }[];
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

const PROF_CELL_COLORS: Record<string, string> = {
  beginner: 'bg-blue-100',
  intermediate: 'bg-blue-300',
  advanced: 'bg-blue-500',
  expert: 'bg-[#1e3a5f]',
};

const PROF_TEXT: Record<string, string> = {
  beginner: 'text-blue-800',
  intermediate: 'text-white',
  advanced: 'text-white',
  expert: 'text-white',
};

export default function SkillsMatrixPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [regionFilter, setRegionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'region' | 'count'>('name');
  const [hoveredCell, setHoveredCell] = useState<{ person: string; skill: string } | null>(null);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (regionFilter) params.set('region', regionFilter);
    if (typeFilter) params.set('type', typeFilter);

    const [peopleRes, skillsRes] = await Promise.all([
      fetch(`/api/people?${params}`),
      fetch(`/api/skills${categoryFilter ? `?category=${categoryFilter}` : ''}`),
    ]);

    if (peopleRes.ok) {
      const data = await peopleRes.json();
      const detailed = await Promise.all(
        data.map(async (p: Person) => {
          const sRes = await fetch(`/api/people/${p.id}/skills`);
          const sData = sRes.ok ? await sRes.json() : [];
          return { ...p, skills: sData };
        })
      );
      setPeople(detailed);
    }
    if (skillsRes.ok) setSkills(await skillsRes.json());
  }, [regionFilter, typeFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedPeople = useMemo(() => {
    const arr = [...people];
    switch (sortBy) {
      case 'name': arr.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'region': arr.sort((a, b) => a.region.localeCompare(b.region)); break;
      case 'count': arr.sort((a, b) => b.skills.length - a.skills.length); break;
    }
    return arr;
  }, [people, sortBy]);

  const getCell = (person: Person, skill: Skill) => {
    const ps = person.skills.find((s: { skillId: string }) => s.skillId === skill.id);
    if (!ps) return null;
    const isStale = Date.now() - new Date(ps.lastUpdated).getTime() > 90 * 24 * 60 * 60 * 1000;
    return { proficiency: ps.proficiency, isStale };
  };

  const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700';

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Skills Matrix</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectClass}>
          <option value="">All Regions</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
          <option value="">All Types</option>
          <option value="intern">Intern</option>
          <option value="fte">FTE</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={selectClass}>
          <option value="name">Sort: Name</option>
          <option value="region">Sort: Region</option>
          <option value="count">Sort: Skill Count</option>
        </select>
      </div>

      {people.length === 0 || skills.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Loading matrix data...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-[11px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 min-w-[160px] border-b border-r border-gray-200">
                    Person
                  </th>
                  {skills.map((s) => (
                    <th
                      key={s.id}
                      className="px-1.5 py-2 text-center font-medium text-gray-600 border-b border-gray-200 min-w-[60px]"
                    >
                      <div className="writing-mode-vertical" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 80 }}>
                        {s.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPeople.map((person) => {
                  const country = COUNTRIES.find((c) => c.code === person.region);
                  return (
                    <tr key={person.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-r border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <span>{country?.flag}</span>
                          <span className="font-medium text-gray-800 truncate max-w-[120px]">{person.name}</span>
                        </div>
                      </td>
                      {skills.map((skill) => {
                        const cell = getCell(person, skill);
                        const isHovered = hoveredCell?.person === person.id && hoveredCell?.skill === skill.id;
                        return (
                          <td
                            key={skill.id}
                            className="px-0.5 py-0.5 text-center relative"
                            onMouseEnter={() => setHoveredCell({ person: person.id, skill: skill.id })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            {cell ? (
                              <div
                                className={`w-full h-7 rounded flex items-center justify-center text-[10px] font-medium
                                  ${PROF_CELL_COLORS[cell.proficiency]} ${PROF_TEXT[cell.proficiency]}
                                  ${cell.isStale ? 'ring-2 ring-orange-400' : ''}`}
                              >
                                {cell.proficiency[0].toUpperCase()}
                              </div>
                            ) : (
                              <div className="w-full h-7 rounded bg-gray-50" />
                            )}
                            {isHovered && cell && (
                              <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-lg">
                                {person.name} · {skill.name} · {PROFICIENCY_LABELS[cell.proficiency]}
                                {cell.isStale && ' (Stale)'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-[10px] text-gray-500">
            <span className="font-medium">Proficiency:</span>
            {Object.entries(PROF_CELL_COLORS).map(([level, color]) => (
              <span key={level} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${color}`} />
                {PROFICIENCY_LABELS[level]}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-200 ring-2 ring-orange-400" />
              Stale (90+ days)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
