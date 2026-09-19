'use client';

import { useState, useEffect, useCallback } from 'react';
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
  mentor?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

export default function PeopleDirectoryPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ region: '', type: '', stage: '', risk: '' });
  const [showForm, setShowForm] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [role, setRole] = useState<string>('intern');
  const router = useRouter();

  const fetchPeople = useCallback(async () => {
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

  useEffect(() => {
    fetchPeople();
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.user?.role || 'intern'));
  }, [fetchPeople]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this person?')) return;
    await fetch(`/api/people/${id}`, { method: 'DELETE' });
    fetchPeople();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">People Directory</h2>
        {role === 'admin' && (
          <button
            onClick={() => { setEditPerson(null); setShowForm(true); }}
            className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2c5282] transition-colors"
          >
            + Add Person
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : people.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No people found.</p>
          <p className="text-sm text-gray-400 mt-1">Load seed data in Settings.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Region</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Risk</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Mentor</th>
                  {role === 'admin' && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const country = COUNTRIES.find((c) => c.code === p.region);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/people/${p.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.type === 'intern' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {p.type === 'fte' ? 'FTE' : 'Intern'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{country?.flag} {country?.name}</td>
                      <td className="px-4 py-3 text-gray-600">{STAGE_LABELS[p.stage] || p.stage}</td>
                      <td className="px-4 py-3"><StatusBadge level={p.riskLevel as 'green' | 'amber' | 'red'} /></td>
                      <td className="px-4 py-3 text-gray-500">{p.mentor?.name || '—'}</td>
                      {role === 'admin' && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => { setEditPerson(p); setShowForm(true); }}
                              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </div>
        </div>
      )}

      {showForm && (
        <PersonForm
          person={editPerson}
          onClose={() => { setShowForm(false); setEditPerson(null); }}
          onSaved={() => { setShowForm(false); setEditPerson(null); fetchPeople(); }}
        />
      )}
    </div>
  );
}

function PersonForm({ person, onClose, onSaved }: {
  person: Person | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!person;
  const [form, setForm] = useState({
    name: person?.name || '',
    email: person?.email || '',
    type: person?.type || 'intern',
    region: person?.region || 'IN',
    mentorId: person?.mentor?.id || '',
    projectId: person?.project?.id || '',
  });
  const [mentors, setMentors] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/people?type=fte').then(r => r.json()).then(data =>
      setMentors(data.map((p: Person) => ({ id: p.id, name: p.name })))
    );
    fetch('/api/projects').then(r => r.json()).then(setProjects);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const url = isEdit ? `/api/people/${person!.id}` : '/api/people';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error || 'Save failed');
    }
    setSaving(false);
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none text-gray-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{isEdit ? 'Edit Person' : 'Add Person'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                <option value="intern">Intern</option>
                <option value="fte">FTE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className={inputClass}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
            <select value={form.mentorId} onChange={(e) => setForm({ ...form, mentorId: e.target.value })} className={inputClass}>
              <option value="">None</option>
              {mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className={inputClass}>
              <option value="">None</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2c5282] disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
