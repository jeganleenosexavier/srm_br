'use client';

import { useState, useEffect, useCallback } from 'react';
import { PROFICIENCY_LEVELS, PROFICIENCY_LABELS } from '@/lib/constants';

interface PersonSkill {
  id: string;
  skillId: string;
  skillName: string;
  category: string;
  proficiency: string;
  lastUpdated: string;
  isStale: boolean;
  certName: string | null;
  certExpiry: string | null;
}

interface AvailableSkill {
  id: string;
  name: string;
  category: string;
}

const PROF_COLORS: Record<string, string> = {
  beginner: 'bg-blue-100 text-blue-700',
  intermediate: 'bg-blue-200 text-blue-800',
  advanced: 'bg-blue-400 text-white',
  expert: 'bg-[#1e3a5f] text-white',
};

function isCertExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

function isCertExpiringSoon(expiry: string | null, days: number = 90): boolean {
  if (!expiry) return false;
  const d = new Date(expiry);
  const threshold = new Date(Date.now() + days * 86400000);
  return d > new Date() && d <= threshold;
}

export default function SkillsTab({ personId, canEdit, isAdmin }: {
  personId: string;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const [skills, setSkills] = useState<PersonSkill[]>([]);
  const [allSkills, setAllSkills] = useState<AvailableSkill[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addSkillId, setAddSkillId] = useState('');
  const [addProf, setAddProf] = useState('beginner');
  const [editCert, setEditCert] = useState<string | null>(null);
  const [certForm, setCertForm] = useState({ certName: '', certExpiry: '' });

  const fetchSkills = useCallback(async () => {
    const res = await fetch(`/api/people/${personId}/skills`);
    if (res.ok) setSkills(await res.json());
  }, [personId]);

  useEffect(() => {
    fetchSkills();
    fetch('/api/skills').then((r) => r.json()).then(setAllSkills);
  }, [fetchSkills]);

  const updateProficiency = async (psId: string, proficiency: string) => {
    await fetch(`/api/people/${personId}/skills`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', personSkillId: psId, proficiency }),
    });
    fetchSkills();
  };

  const addSkill = async () => {
    if (!addSkillId) return;
    await fetch(`/api/people/${personId}/skills`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', skillId: addSkillId, proficiency: addProf }),
    });
    setShowAdd(false);
    setAddSkillId('');
    setAddProf('beginner');
    fetchSkills();
  };

  const removeSkill = async (psId: string) => {
    if (!confirm('Remove this skill?')) return;
    await fetch(`/api/people/${personId}/skills`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', personSkillId: psId }),
    });
    fetchSkills();
  };

  const saveCert = async (psId: string) => {
    await fetch(`/api/people/${personId}/skills`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_cert',
        personSkillId: psId,
        certName: certForm.certName || null,
        certExpiry: certForm.certExpiry || null,
      }),
    });
    setEditCert(null);
    setCertForm({ certName: '', certExpiry: '' });
    fetchSkills();
  };

  const assignedSkillIds = new Set(skills.map((s) => s.skillId));
  const unassigned = allSkills.filter((s) => !assignedSkillIds.has(s.id));

  const grouped = skills.reduce<Record<string, PersonSkill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Assigned Skills</h3>
        {canEdit && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:bg-[#2c5282]"
          >
            + Add Skill
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Skill</label>
            <select
              value={addSkillId}
              onChange={(e) => setAddSkillId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
            >
              <option value="">Select skill...</option>
              {unassigned.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Proficiency</label>
            <select
              value={addProf}
              onChange={(e) => setAddProf(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
            >
              {PROFICIENCY_LEVELS.map((p) => (
                <option key={p} value={p}>{PROFICIENCY_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <button onClick={addSkill} className="text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2c5282]">
            Add
          </button>
          <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 px-2 py-2">
            Cancel
          </button>
        </div>
      )}

      {skills.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No skills assigned yet.</p>
      ) : (
        Object.entries(grouped).map(([category, catSkills]) => (
          <div key={category} className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{category}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {catSkills.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{s.skillName}</span>
                      {s.isStale && (
                        <span className="text-orange-500 text-xs flex items-center gap-1" title="Not updated in 90+ days">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          Stale
                        </span>
                      )}
                      {s.certName && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          isCertExpired(s.certExpiry) ? 'bg-red-100 text-red-700' :
                          isCertExpiringSoon(s.certExpiry) ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isCertExpired(s.certExpiry) && '⚠ '}
                          {s.certName}
                          {s.certExpiry && ` · ${isCertExpired(s.certExpiry) ? 'Expired' : new Date(s.certExpiry).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit ? (
                        <select
                          value={s.proficiency}
                          onChange={(e) => updateProficiency(s.id, e.target.value)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${PROF_COLORS[s.proficiency] || PROF_COLORS.beginner}`}
                        >
                          {PROFICIENCY_LEVELS.map((p) => (
                            <option key={p} value={p}>{PROFICIENCY_LABELS[p]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PROF_COLORS[s.proficiency] || PROF_COLORS.beginner}`}>
                          {PROFICIENCY_LABELS[s.proficiency] || s.proficiency}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 w-20 text-right">
                        {new Date(s.lastUpdated).toLocaleDateString()}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => { setEditCert(s.id); setCertForm({ certName: s.certName || '', certExpiry: s.certExpiry ? s.certExpiry.split('T')[0] : '' }); }}
                          title="Edit certification"
                          className="text-gray-300 hover:text-[#1e3a5f] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => removeSkill(s.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {editCert === s.id && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Certification Name</label>
                        <input
                          type="text"
                          value={certForm.certName}
                          onChange={(e) => setCertForm({ ...certForm, certName: e.target.value })}
                          placeholder="e.g. AWS Solutions Architect"
                          className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Expiry Date</label>
                        <input
                          type="date"
                          value={certForm.certExpiry}
                          onChange={(e) => setCertForm({ ...certForm, certExpiry: e.target.value })}
                          className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700"
                        />
                      </div>
                      <button onClick={() => saveCert(s.id)} className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:bg-[#2c5282]">
                        Save
                      </button>
                      <button onClick={() => setEditCert(null)} className="text-xs text-gray-500 px-2 py-1.5">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
