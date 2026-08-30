'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { COUNTRIES, COMPLIANCE_LABELS, COMPLIANCE_TYPES } from '@/lib/constants';

interface ComplianceAlert {
  id: string;
  personId: string;
  personName: string;
  region: string;
  itemType: string;
  status: string;
  expiryDate: string;
  daysRemaining: number;
  urgency: '30' | '60' | '90';
}

const URGENCY_STYLES = {
  '30': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', label: 'Critical' },
  '60': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', label: 'Warning' },
  '90': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: 'Upcoming' },
};

const HR_CONTACTS: Record<string, { name: string; email: string }> = {
  SG: { name: 'Outsourced HR Partner (SG)', email: 'hr-sg@beauroi.demo' },
  UK: { name: 'Outsourced HR Partner (UK)', email: 'hr-uk@beauroi.demo' },
  IN: { name: 'Outsourced HR Partner (IN)', email: 'hr-in@beauroi.demo' },
  LK: { name: 'Outsourced HR Partner (LK)', email: 'hr-lk@beauroi.demo' },
  ZA: { name: 'Outsourced HR Partner (ZA)', email: 'hr-za@beauroi.demo' },
};

export default function ComplianceAlertsPage() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set());
  const [escalateModal, setEscalateModal] = useState<ComplianceAlert | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const country = searchParams.get('country');
    if (country) setCountryFilter(country);
  }, [searchParams]);

  const fetchAlerts = useCallback(async () => {
    const params = new URLSearchParams();
    if (countryFilter) params.set('country', countryFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (urgencyFilter) params.set('urgency', urgencyFilter);

    const res = await fetch(`/api/compliance/alerts?${params}`);
    if (res.ok) setAlerts(await res.json());
    setLoading(false);
  }, [countryFilter, typeFilter, urgencyFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleEscalate = (alert: ComplianceAlert, e: React.MouseEvent) => {
    e.stopPropagation();
    setEscalateModal(alert);
  };

  const confirmEscalate = () => {
    if (escalateModal) {
      setEscalatedIds((prev) => new Set(prev).add(escalateModal.id));
      setEscalateModal(null);
    }
  };

  const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700';

  const grouped = {
    '30': alerts.filter((a) => a.urgency === '30'),
    '60': alerts.filter((a) => a.urgency === '60'),
    '90': alerts.filter((a) => a.urgency === '90'),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">Compliance Alerts</h2>
        <button
          onClick={() => router.push('/compliance')}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2.5 py-1 rounded-lg"
        >
          Overview
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={selectClass}>
          <option value="">All Countries</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
          <option value="">All Types</option>
          {COMPLIANCE_TYPES.map((t) => <option key={t} value={t}>{COMPLIANCE_LABELS[t]}</option>)}
        </select>
        <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className={selectClass}>
          <option value="">All Urgency</option>
          <option value="30">Critical (30 days)</option>
          <option value="60">Warning (60 days)</option>
          <option value="90">Upcoming (90 days)</option>
        </select>
        {(countryFilter || typeFilter || urgencyFilter) && (
          <button
            onClick={() => { setCountryFilter(''); setTypeFilter(''); setUrgencyFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No compliance alerts</h3>
          <p className="text-sm text-gray-500">All clear! No items expiring or pending.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(['30', '60', '90'] as const).map((band) => {
            const bandAlerts = grouped[band];
            if (bandAlerts.length === 0) return null;
            const style = URGENCY_STYLES[band];

            return (
              <div key={band}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {band === '30' ? 'Within 30 days' : band === '60' ? '30-60 days' : '60-90 days'}
                  </span>
                  <span className="text-xs text-gray-400">({bandAlerts.length})</span>
                </div>

                <div className="space-y-2">
                  {bandAlerts.map((alert) => {
                    const country = COUNTRIES.find((c) => c.code === alert.region);
                    const isEscalated = escalatedIds.has(alert.id);
                    return (
                      <div
                        key={alert.id}
                        onClick={() => router.push(`/people/${alert.personId}`)}
                        className={`${style.bg} border ${style.border} rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{country?.flag}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {alert.personName}
                              {isEscalated && (
                                <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                                  Escalated
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {COMPLIANCE_LABELS[alert.itemType] || alert.itemType}
                              {alert.status !== 'complete' && ` · Status: ${alert.status}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEscalated && (
                            <button
                              onClick={(e) => handleEscalate(alert, e)}
                              className="text-[11px] bg-white border border-gray-300 text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Escalate to HR
                            </button>
                          )}
                          <div className="text-right">
                            {alert.expiryDate ? (
                              <>
                                <p className={`text-sm font-semibold ${style.text}`}>
                                  {alert.daysRemaining <= 0 ? 'Expired' : `${alert.daysRemaining} days`}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(alert.expiryDate).toLocaleDateString()}
                                </p>
                              </>
                            ) : (
                              <p className={`text-sm font-semibold ${style.text}`}>
                                {alert.status === 'expired' ? 'Expired' : 'Action needed'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="text-xs text-gray-400 pt-2">
            {alerts.length} alert{alerts.length > 1 ? 's' : ''} total
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {escalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEscalateModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Escalate to HR</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Person:</span> {escalateModal.personName}
              </p>
              <p className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Issue:</span> {COMPLIANCE_LABELS[escalateModal.itemType] || escalateModal.itemType}
              </p>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">HR Contact</p>
                <p className="text-sm font-medium text-gray-800">
                  {HR_CONTACTS[escalateModal.region]?.name || 'HR Partner'}
                </p>
                <p className="text-sm text-[#1e3a5f]">
                  {HR_CONTACTS[escalateModal.region]?.email || 'hr@beauroi.demo'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This will mark the alert as escalated. No email will be sent in demo mode.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEscalateModal(null)} className="text-sm text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button onClick={confirmEscalate} className="text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2c5282]">
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
