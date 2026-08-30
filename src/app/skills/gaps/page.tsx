'use client';

import { useState, useEffect, useCallback } from 'react';
import { COUNTRIES, PROFICIENCY_LABELS } from '@/lib/constants';

interface Role {
  id: string;
  name: string;
  requiredSkills: { skillId: string; skillName: string; minimumLevel: string }[];
}

interface TeamGapResult {
  roleId: string;
  roleName: string;
  skills: {
    skillId: string;
    skillName: string;
    requiredLevel: string;
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
    total: number;
    coveragePercent: number;
  }[];
  overallCoverage: number;
}

export default function SkillsGapsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [gapResult, setGapResult] = useState<TeamGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [drillData, setDrillData] = useState<Record<string, { name: string; region: string; proficiency: string }[]>>({});

  useEffect(() => {
    fetch('/api/roles').then((r) => r.json()).then((data) => {
      setRoles(data);
      if (data.length > 0) setSelectedRoleId(data[0].id);
    });
  }, []);

  const fetchGaps = useCallback(async () => {
    if (!selectedRoleId) return;
    setLoading(true);
    const params = regionFilter ? `?region=${regionFilter}` : '';
    const res = await fetch(`/api/roles/${selectedRoleId}/gaps${params}`);
    if (res.ok) setGapResult(await res.json());
    setLoading(false);
  }, [selectedRoleId, regionFilter]);

  useEffect(() => { fetchGaps(); }, [fetchGaps]);

  const fetchDrill = async (skillId: string) => {
    if (drillData[skillId]) {
      setExpandedSkill(expandedSkill === skillId ? null : skillId);
      return;
    }
    const params = new URLSearchParams();
    if (regionFilter) params.set('region', regionFilter);
    const res = await fetch(`/api/people?${params}`);
    if (!res.ok) return;
    const people = await res.json();

    const detailed = await Promise.all(
      people.map(async (p: { id: string; name: string; region: string }) => {
        const sRes = await fetch(`/api/people/${p.id}/skills`);
        const skills = sRes.ok ? await sRes.json() : [];
        const match = skills.find((s: { skillId: string }) => s.skillId === skillId);
        return match ? { name: p.name, region: p.region, proficiency: match.proficiency } : null;
      })
    );

    setDrillData((prev) => ({ ...prev, [skillId]: detailed.filter(Boolean) }));
    setExpandedSkill(skillId);
  };

  const coverageColor = (pct: number) => {
    if (pct >= 70) return 'text-emerald-700 bg-emerald-50';
    if (pct >= 40) return 'text-amber-700 bg-amber-50';
    return 'text-red-700 bg-red-50';
  };

  const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700';

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Role Gap Analysis</h2>

      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className={selectClass}
          >
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectClass}>
            <option value="">All Regions</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Analyzing gaps...</div>
      ) : gapResult ? (
        <div className="space-y-5">
          {/* Overall score */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{gapResult.roleName}</h3>
                <p className="text-sm text-gray-500">{gapResult.skills.length} required skills</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${gapResult.overallCoverage >= 70 ? 'text-emerald-600' : gapResult.overallCoverage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {gapResult.overallCoverage}%
                </div>
                <p className="text-xs text-gray-500">Overall Coverage</p>
              </div>
            </div>

            <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${gapResult.overallCoverage >= 70 ? 'bg-emerald-500' : gapResult.overallCoverage >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${gapResult.overallCoverage}%` }}
              />
            </div>
          </div>

          {/* Per-skill breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Required Skills</span>
            </div>
            <div className="divide-y divide-gray-100">
              {gapResult.skills.map((skill) => (
                <div key={skill.skillId}>
                  <div
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => fetchDrill(skill.skillId)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{skill.skillName}</span>
                      <span className="text-[10px] text-gray-400">
                        Min: {PROFICIENCY_LABELS[skill.requiredLevel]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5 text-[10px]">
                        {skill.expert > 0 && <span className="bg-[#1e3a5f] text-white px-1.5 py-0.5 rounded">{skill.expert} Exp</span>}
                        {skill.advanced > 0 && <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded">{skill.advanced} Adv</span>}
                        {skill.intermediate > 0 && <span className="bg-blue-300 text-white px-1.5 py-0.5 rounded">{skill.intermediate} Int</span>}
                        {skill.beginner > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{skill.beginner} Beg</span>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${coverageColor(skill.coveragePercent)}`}>
                        {skill.coveragePercent}%
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedSkill === skill.skillId ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {expandedSkill === skill.skillId && drillData[skill.skillId] && (
                    <div className="px-6 pb-3 bg-gray-50">
                      <p className="text-xs font-medium text-gray-600 mb-2">People with this skill:</p>
                      {drillData[skill.skillId].length === 0 ? (
                        <p className="text-xs text-gray-400">No one has this skill</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                          {drillData[skill.skillId].map((p, i) => {
                            const country = COUNTRIES.find((c) => c.code === p.region);
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-white px-2 py-1.5 rounded border border-gray-200">
                                <span>{country?.flag}</span>
                                <span className="truncate">{p.name}</span>
                                <span className="ml-auto text-gray-400">{PROFICIENCY_LABELS[p.proficiency]}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
