'use client';

import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { COMPLIANCE_LABELS } from '@/lib/constants';

interface ComplianceItem {
  id: string;
  itemType: string;
  status: string;
  expiryDate: string | null;
}

interface ComplianceBadge {
  level: 'green' | 'amber' | 'red';
  reasons: string[];
}

interface Country {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  benefitsSummary: string | null;
}

interface ComplianceData {
  person: { id: string; name: string; region: string; type: string; payBand: string | null; payEquityStatus: string | null };
  country: Country | null;
  badge: ComplianceBadge;
  items: ComplianceItem[];
}

const STATUS_OPTIONS = ['pending', 'complete', 'expired'];

const PAY_BANDS: Record<string, Record<string, string>> = {
  SG: { L1: '48K–60K SGD', L2: '60K–84K SGD', L3: '84K–120K SGD' },
  UK: { L1: '28K–35K GBP', L2: '35K–50K GBP', L3: '50K–75K GBP' },
  IN: { L1: '4L–6L INR', L2: '6L–9L INR', L3: '9L–15L INR' },
  LK: { L1: '1.2M–1.8M LKR', L2: '1.8M–2.8M LKR', L3: '2.8M–4.5M LKR' },
  ZA: { L1: '250K–350K ZAR', L2: '350K–500K ZAR', L3: '500K–750K ZAR' },
};

const PAY_LEVEL_LABELS: Record<string, string> = {
  L1: 'L1 (Junior)', L2: 'L2 (Mid)', L3: 'L3 (Senior)',
};

const COL_FACTORS: Record<string, number> = {
  SG: 1.15, UK: 1.00, IN: 0.35, LK: 0.25, ZA: 0.45,
};

export default function ComplianceTab({ personId, isAdmin }: {
  personId: string;
  isAdmin: boolean;
}) {
  const [data, setData] = useState<ComplianceData | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/people/${personId}/compliance`);
    if (res.ok) setData(await res.json());
  }, [personId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateItem = async (itemId: string, updates: { status?: string; expiryDate?: string | null }) => {
    await fetch(`/api/people/${personId}/compliance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, ...updates }),
    });
    fetchData();
  };

  if (!data) return <div className="text-center py-8 text-gray-400">Loading...</div>;

  const { badge, items, country, person } = data;
  const region = person.region;
  const payBand = person.payBand || (person.type === 'fte' ? 'L2' : 'L1');
  const colFactor = COL_FACTORS[region] || 1.0;
  const bandRange = PAY_BANDS[region]?.[payBand] || '—';
  const equityStatus = person.payEquityStatus || 'Compliant';

  return (
    <div className="space-y-5">
      {/* Badge + Region */}
      <div className="flex items-start gap-5 flex-wrap">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1 min-w-[280px]">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Compliance Status</h3>
          <div className="flex items-center gap-3 mb-3">
            <StatusBadge level={badge.level} label={`Compliance: ${badge.level}`} size="md" />
          </div>
          {badge.reasons.length > 0 ? (
            <ul className="space-y-1">
              {badge.reasons.map((r, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    badge.level === 'red' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-600">All compliance items are up to date.</p>
          )}
        </div>

        {country && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 w-72">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Region</h3>
            <p className="text-sm text-gray-800 font-medium">{country.name}</p>
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <p>Currency: {country.currency}</p>
              <p>Timezone: {country.timezone}</p>
              {country.benefitsSummary && (
                <p className="mt-2 text-gray-400">{country.benefitsSummary}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pay Band + COL */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Pay Band & Cost of Living</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Band</p>
            <p className="text-sm font-medium text-gray-800">
              {PAY_LEVEL_LABELS[payBand] || payBand}-{region}
            </p>
            <p className="text-sm text-[#1e3a5f] font-semibold">{bandRange}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">COL Factor</p>
            <p className="text-sm text-gray-800">
              {colFactor.toFixed(2)} <span className="text-xs text-gray-400">(vs UK = 1.00)</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Pay Equity</p>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              equityStatus === 'Compliant' ? 'bg-emerald-100 text-emerald-700' :
              equityStatus === 'Flagged' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {equityStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-700">Compliance Checklist</span>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.status === 'complete' ? 'bg-emerald-100 text-emerald-600' :
                  item.status === 'expired' ? 'bg-red-100 text-red-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {item.status === 'complete' ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : item.status === 'expired' ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01" /></svg>
                  )}
                </div>
                <span className="text-sm text-gray-800 font-medium">
                  {COMPLIANCE_LABELS[item.itemType] || item.itemType}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <>
                    <select
                      value={item.status}
                      onChange={(e) => updateItem(item.id, { status: e.target.value })}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${
                        item.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {(item.itemType === 'gdpr_consent'
                        ? ['pending', 'complete']
                        : STATUS_OPTIONS
                      ).map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>

                    {['contract', 'tax_form', 'work_authorization'].includes(item.itemType) && (
                      <input
                        type="date"
                        value={item.expiryDate ? item.expiryDate.split('T')[0] : ''}
                        onChange={(e) => updateItem(item.id, { expiryDate: e.target.value || null })}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1 text-gray-700"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      item.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'expired' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>

                    {item.expiryDate && (
                      <span className="text-xs text-gray-400">
                        Exp: {new Date(item.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
