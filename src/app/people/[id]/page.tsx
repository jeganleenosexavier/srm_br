'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmModal from '@/components/shared/ConfirmModal';
import SkillsTab from '@/components/people/SkillsTab';
import ComplianceTab from '@/components/people/ComplianceTab';
import { STAGES, STAGE_LABELS, COUNTRIES } from '@/lib/constants';

interface RiskSignal {
  id: string;
  name: string;
  weight: 'high' | 'medium' | 'low';
  triggered: boolean;
  detail: string;
}

interface RiskResult {
  personId: string;
  level: 'green' | 'amber' | 'red';
  signalCount: number;
  signals: RiskSignal[];
}

interface Review {
  id: string;
  date: string;
  technical: number | null;
  communication: number | null;
  learningAgility: number | null;
  notes: string;
  recommendation: string | null;
  mentor: { id: string; name: string };
}

interface StageEntry {
  id: string;
  stage: string;
  timestamp: string;
  user: { email: string };
}

interface PersonDetail {
  id: string;
  name: string;
  email: string;
  type: string;
  region: string;
  stage: string;
  riskLevel: string;
  complianceStatus: string;
  startDate: string;
  exitReason: string | null;
  mentor: { id: string; name: string; email: string } | null;
  project: { id: string; name: string; domain: string; region: string } | null;
  reviewsReceived: Review[];
  stageHistories: StageEntry[];
  complianceItems: unknown[];
  skills: unknown[];
}

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [role, setRole] = useState('viewer');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [stageConfirm, setStageConfirm] = useState<string | null>(null);
  const [exitReasonModal, setExitReasonModal] = useState(false);
  const [exitReason, setExitReason] = useState('');
  const [riskData, setRiskData] = useState<RiskResult | null>(null);
  const [riskExpanded, setRiskExpanded] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const router = useRouter();

  const fetchPerson = useCallback(async () => {
    const res = await fetch(`/api/people/${id}`);
    if (res.ok) setPerson(await res.json());
    setLoading(false);
  }, [id]);

  const fetchRisk = useCallback(async () => {
    const res = await fetch(`/api/people/${id}/risk`);
    if (res.ok) setRiskData(await res.json());
  }, [id]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    const res = await fetch(`/api/people/${id}/risk/recalculate`, { method: 'POST' });
    if (res.ok) {
      setRiskData(await res.json());
      fetchPerson();
    }
    setRecalculating(false);
  };

  useEffect(() => {
    fetchPerson();
    fetchRisk();
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.user?.role || 'viewer'));
  }, [fetchPerson, fetchRisk]);

  const handleStageChange = async (newStage: string, reason?: string) => {
    if (newStage === 'exit' && !exitReasonModal && !reason) {
      setExitReasonModal(true);
      return;
    }
    const requiresConfirm = ['fte_offer', 'fte_hired'].includes(newStage);
    if (requiresConfirm && !stageConfirm) {
      setStageConfirm(newStage);
      return;
    }
    setStageConfirm(null);
    setExitReasonModal(false);

    const body: Record<string, string> = { personId: id, newStage };
    if (newStage === 'exit' && reason) body.exitReason = reason;

    await fetch('/api/pipeline/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    fetchPerson();
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!person) return <div className="text-center py-12 text-gray-500">Person not found</div>;

  const country = COUNTRIES.find((c) => c.code === person.region);
  const canEdit = role === 'admin' || role === 'mentor';

  const tabs = [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'skills', label: 'Skills' },
    { key: 'compliance', label: 'Compliance' },
  ];

  return (
    <div>
      <button onClick={() => router.push('/people')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to People
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-800">{person.name}</h2>
              <span className="text-lg">{country?.flag}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                person.type === 'intern' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
              }`}>
                {person.type === 'fte' ? 'FTE' : 'Intern'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{person.email}</p>
            <p className="text-xs text-gray-400 mt-1">Started {new Date(person.startDate).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRiskExpanded(!riskExpanded)} className="cursor-pointer">
              <StatusBadge level={(riskData?.level || person.riskLevel) as 'green' | 'amber' | 'red'} label={`Risk: ${riskData?.level || person.riskLevel}`} size="md" />
            </button>
            <StatusBadge level={person.complianceStatus as 'green' | 'amber' | 'red'} label={`Compliance: ${person.complianceStatus}`} size="md" />
          </div>
        </div>

        {riskExpanded && riskData && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">
                Risk Signals ({riskData.signalCount} triggered)
              </h4>
              {role === 'admin' && (
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg disabled:opacity-50"
                >
                  {recalculating ? 'Recalculating...' : 'Recalculate'}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {riskData.signals.map((signal) => (
                <div key={signal.id} className={`flex items-start gap-2 text-sm ${signal.triggered ? '' : 'opacity-40'}`}>
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${signal.triggered ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{signal.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        signal.weight === 'high' ? 'bg-red-50 text-red-700' :
                        signal.weight === 'medium' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{signal.weight}</span>
                    </div>
                    <p className="text-xs text-gray-500">{signal.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 mb-5">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pipeline' && (
        <PipelineTab
          person={person}
          canEdit={canEdit}
          onStageChange={handleStageChange}
          showReviewForm={showReviewForm}
          setShowReviewForm={setShowReviewForm}
          onReviewSaved={fetchPerson}
        />
      )}
      {activeTab === 'skills' && (
        <SkillsTab personId={id} canEdit={canEdit} isAdmin={role === 'admin'} />
      )}
      {activeTab === 'compliance' && (
        <ComplianceTab personId={id} isAdmin={role === 'admin'} />
      )}

      {stageConfirm && (
        <ConfirmModal
          title={`Move to ${STAGE_LABELS[stageConfirm]}`}
          message={`Are you sure you want to move ${person.name} to "${STAGE_LABELS[stageConfirm]}"? This action will be logged.`}
          confirmLabel="Move"
          onConfirm={() => handleStageChange(stageConfirm)}
          onCancel={() => setStageConfirm(null)}
        />
      )}

      {exitReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Exit Reason</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please select a reason for moving {person.name} to Exit.
            </p>
            <select
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mb-4"
            >
              <option value="">Select reason...</option>
              <option value="skills_gap">Skills Gap</option>
              <option value="left_voluntarily">Left Voluntarily</option>
              <option value="role_mismatch">Role Mismatch</option>
              <option value="performance">Performance</option>
              <option value="contract_end">Contract End</option>
              <option value="relocated">Relocated</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setExitReasonModal(false); setExitReason(''); }}
                className="text-sm text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStageChange('exit', exitReason || 'other')}
                className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineTab({ person, canEdit, onStageChange, showReviewForm, setShowReviewForm, onReviewSaved }: {
  person: PersonDetail;
  canEdit: boolean;
  onStageChange: (stage: string) => void;
  showReviewForm: boolean;
  setShowReviewForm: (v: boolean) => void;
  onReviewSaved: () => void;
}) {
  const currentIdx = STAGES.indexOf(person.stage as typeof STAGES[number]);

  return (
    <div className="space-y-5">
      {/* Stage stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Progress</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STAGES.map((stage, idx) => {
            const isActive = idx === currentIdx;
            const isPast = idx < currentIdx;
            return (
              <div key={stage} className="flex items-center">
                <div className={`flex flex-col items-center min-w-[80px] ${
                  isActive ? '' : isPast ? 'opacity-70' : 'opacity-40'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-[#1e3a5f] text-white' : isPast ? 'bg-[#c9a84c] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[10px] mt-1 text-center leading-tight ${isActive ? 'text-[#1e3a5f] font-semibold' : 'text-gray-500'}`}>
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
                {idx < STAGES.length - 1 && (
                  <div className={`w-6 h-0.5 ${isPast ? 'bg-[#c9a84c]' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {canEdit && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-600 mr-2">Move to:</label>
            <select
              value=""
              onChange={(e) => { if (e.target.value) onStageChange(e.target.value); }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700"
            >
              <option value="">Select stage...</option>
              {STAGES.filter((s) => s !== person.stage).map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Mentor</h4>
          {person.mentor ? (
            <div>
              <p className="text-sm text-gray-800 font-medium">{person.mentor.name}</p>
              <p className="text-xs text-gray-500">{person.mentor.email}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No mentor assigned</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Project</h4>
          {person.project ? (
            <div>
              <p className="text-sm text-gray-800 font-medium">{person.project.name}</p>
              <p className="text-xs text-gray-500">{person.project.domain} · {person.project.region}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No project assigned</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Tenure</h4>
          <p className="text-sm text-gray-800 font-medium">
            {Math.floor((Date.now() - new Date(person.startDate).getTime()) / (30.44 * 86400000))} months
          </p>
          {person.stage === 'exit' && person.exitReason && (
            <p className="text-xs text-red-600 mt-1">
              Exit reason: {person.exitReason.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Stage history */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Stage History</h3>
        {person.stageHistories.length === 0 ? (
          <p className="text-sm text-gray-400">No stage history yet</p>
        ) : (
          <div className="space-y-2">
            {person.stageHistories.map((h, idx) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${
                    idx === person.stageHistories.length - 1 ? 'bg-[#1e3a5f]' : 'bg-gray-300'
                  }`} />
                  {idx < person.stageHistories.length - 1 && <div className="w-px h-6 bg-gray-200" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm text-gray-800 font-medium">{STAGE_LABELS[h.stage] || h.stage}</p>
                  <p className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleString()} · by {h.user.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Reviews</h3>
          {canEdit && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:bg-[#2c5282]"
            >
              + Add Review
            </button>
          )}
        </div>
        {person.reviewsReceived.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet</p>
        ) : (
          <div className="space-y-3">
            {person.reviewsReceived.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString()} · by {r.mentor.name}</span>
                  {r.recommendation && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      r.recommendation === 'recommend_fte' ? 'bg-emerald-50 text-emerald-700' :
                      r.recommendation === 'extend' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {r.recommendation === 'recommend_fte' ? 'Recommend FTE' :
                       r.recommendation === 'extend' ? 'Extend' : 'Exit'}
                    </span>
                  )}
                </div>
                {(r.technical || r.communication || r.learningAgility) && (
                  <div className="flex gap-4 mb-2 text-xs text-gray-600">
                    {r.technical && <span>Technical: {r.technical}/5</span>}
                    {r.communication && <span>Communication: {r.communication}/5</span>}
                    {r.learningAgility && <span>Learning: {r.learningAgility}/5</span>}
                  </div>
                )}
                {r.notes && <p className="text-sm text-gray-700">{r.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {showReviewForm && (
          <ReviewForm
            personId={person.id}
            onClose={() => setShowReviewForm(false)}
            onSaved={() => { setShowReviewForm(false); onReviewSaved(); }}
          />
        )}
      </div>
    </div>
  );
}

function ReviewForm({ personId, onClose, onSaved }: {
  personId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    technical: '',
    communication: '',
    learningAgility: '',
    notes: '',
    recommendation: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/people/${personId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) onSaved();
    setSaving(false);
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none text-gray-900';

  return (
    <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">New Review</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Technical (1-5)</label>
            <input type="number" min="1" max="5" step="0.5" value={form.technical} onChange={(e) => setForm({ ...form, technical: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Communication (1-5)</label>
            <input type="number" min="1" max="5" step="0.5" value={form.communication} onChange={(e) => setForm({ ...form, communication: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Learning (1-5)</label>
            <input type="number" min="1" max="5" step="0.5" value={form.learningAgility} onChange={(e) => setForm({ ...form, learningAgility: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes *</label>
          <textarea required value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Recommendation</label>
          <select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} className={inputClass}>
            <option value="">Select...</option>
            <option value="recommend_fte">Recommend FTE</option>
            <option value="extend">Extend</option>
            <option value="exit">Exit</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
          <button type="submit" disabled={saving} className="text-sm bg-[#1e3a5f] text-white px-4 py-1.5 rounded-lg hover:bg-[#2c5282] disabled:opacity-50">
            {saving ? 'Saving...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
