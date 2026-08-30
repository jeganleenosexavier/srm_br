'use client';

import { useState } from 'react';
import { COUNTRIES } from '@/lib/constants';

type ReportType = 'pipeline' | 'skills_gap' | 'compliance';

const REPORTS: { type: ReportType; label: string; description: string; icon: string }[] = [
  { type: 'pipeline', label: 'Pipeline Report', description: 'All people with stage, type, region, mentor, and risk level', icon: '📊' },
  { type: 'skills_gap', label: 'Skills Gap Report', description: 'Role-based skill coverage with gap percentages', icon: '🎯' },
  { type: 'compliance', label: 'Compliance Report', description: 'Per-person compliance status with item details', icon: '🛡️' },
];

export default function ReportsPage() {
  const [regionFilter, setRegionFilter] = useState('');
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  const download = async (type: ReportType) => {
    setDownloading(type);
    try {
      let csvContent = '';

      if (type === 'pipeline') {
        const params = new URLSearchParams();
        if (regionFilter) params.set('region', regionFilter);
        const res = await fetch(`/api/people?${params}`);
        const people = await res.json();
        csvContent = 'Name,Email,Type,Region,Stage,Risk Level,Mentor,Project\n';
        for (const p of people) {
          csvContent += `"${p.name}","${p.email}","${p.type}","${p.region}","${p.stage}","${p.riskLevel}","${p.mentor?.name || ''}","${p.project?.name || ''}"\n`;
        }
      } else if (type === 'skills_gap') {
        const rolesRes = await fetch('/api/roles');
        const roles = await rolesRes.json();
        csvContent = 'Role,Skill,Minimum Level,Coverage %\n';
        for (const role of roles) {
          const params = new URLSearchParams();
          if (regionFilter) params.set('region', regionFilter);
          const gapRes = await fetch(`/api/roles/${role.id}/gaps?${params}`);
          const gap = await gapRes.json();
          if (gap.skills) {
            for (const s of gap.skills) {
              csvContent += `"${gap.roleName}","${s.skillName}","${s.minimumLevel}","${s.coveragePercent}"\n`;
            }
          }
        }
      } else if (type === 'compliance') {
        const params = new URLSearchParams();
        if (regionFilter) params.set('country', regionFilter);
        const res = await fetch(`/api/compliance/alerts?${params}`);
        const alerts = await res.json();
        csvContent = 'Person,Region,Item Type,Status,Expiry Date,Days Remaining,Urgency\n';
        for (const a of alerts) {
          csvContent += `"${a.personName}","${a.region}","${a.itemType}","${a.status}","${a.expiryDate || ''}","${a.daysRemaining}","${a.urgency}"\n`;
        }
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_report${regionFilter ? `_${regionFilter}` : ''}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setDownloading(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Reports</h2>

      <div className="mb-5">
        <label className="text-xs font-medium text-gray-600 mr-2">Filter by region:</label>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
        >
          <option value="">All Regions</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <div key={report.type} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-3xl mb-3">{report.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{report.label}</h3>
            <p className="text-sm text-gray-500 mb-4">{report.description}</p>
            <button
              onClick={() => download(report.type)}
              disabled={downloading === report.type}
              className="w-full text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2c5282] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {downloading === report.type ? (
                'Generating...'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download CSV
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
