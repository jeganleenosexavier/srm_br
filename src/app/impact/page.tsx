'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  calculateImpact, DEFAULT_INPUTS, PRESETS,
  type ImpactInputs, type ImpactOutputs,
} from '@/services/impact.engine';

const USD = (n: number) => `$${n.toLocaleString()}`;

const INPUT_CONFIG: {
  key: keyof ImpactInputs;
  label: string;
  type: 'number' | 'slider';
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  prefix?: string;
}[] = [
  { key: 'monthlyInternVolume', label: 'Monthly Intern Volume', type: 'number', min: 1, max: 500 },
  { key: 'currentConversionPercent', label: 'Current Conversion %', type: 'slider', min: 1, max: 50, suffix: '%' },
  { key: 'targetConversionPercent', label: 'Target Conversion %', type: 'slider', min: 1, max: 50, suffix: '%' },
  { key: 'avgAgencyHireCost', label: 'Avg Agency Hire Cost', type: 'number', min: 1000, max: 50000, prefix: '$' },
  { key: 'currentRetentionPercent', label: 'Current Retention %', type: 'slider', min: 50, max: 100, suffix: '%' },
  { key: 'targetRetentionPercent', label: 'Target Retention %', type: 'slider', min: 50, max: 100, suffix: '%' },
  { key: 'avgReplacementCost', label: 'Avg Replacement Cost', type: 'number', min: 5000, max: 100000, prefix: '$' },
  { key: 'headcountGrowthTarget', label: 'Headcount Growth Target', type: 'slider', min: 0, max: 200, suffix: '%' },
  { key: 'baselineTalentOpsCost', label: 'Baseline Ops Cost (USD/yr)', type: 'number', min: 50000, max: 5000000, prefix: '$' },
  { key: 'marginAssumption', label: 'Margin Assumption', type: 'slider', min: 10, max: 50, suffix: '%' },
];

const DONUT_COLORS = ['#1e3a5f', '#c9a84c', '#6b7280'];

export default function ImpactCalculatorPage() {
  const [inputs, setInputs] = useState<ImpactInputs>({ ...DEFAULT_INPUTS });
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setReadOnly(d.user?.role === 'viewer'));
  }, []);

  const outputs: ImpactOutputs = useMemo(() => calculateImpact(inputs), [inputs]);

  const applyPreset = (key: string) => {
    const overrides = PRESETS[key];
    if (overrides) setInputs({ ...DEFAULT_INPUTS, ...overrides });
  };

  const updateInput = (key: keyof ImpactInputs, val: number) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  const barData = [
    { name: 'Intern→FTE / yr', Current: Math.round(inputs.monthlyInternVolume * 12 * inputs.currentConversionPercent / 100), Projected: Math.round(inputs.monthlyInternVolume * 12 * inputs.targetConversionPercent / 100) },
    { name: 'Retention %', Current: inputs.currentRetentionPercent, Projected: inputs.targetRetentionPercent },
  ];

  const donutData = [
    { name: 'Recruiting', value: outputs.recruitingCostSaved },
    { name: 'Retention', value: outputs.retentionSavings },
    { name: 'Ops Efficiency', value: outputs.opsEfficiencySaving },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Impact Calculator</h2>

      <div className="flex gap-2 mb-5">
        {Object.keys(PRESETS).map((key) => (
          <button
            key={key}
            onClick={() => !readOnly && applyPreset(key)}
            disabled={readOnly}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 capitalize"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Inputs</h3>
          <div className="space-y-4">
            {INPUT_CONFIG.map((cfg) => (
              <div key={cfg.key}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-gray-600">{cfg.label}</label>
                  <span className="text-xs text-gray-500">
                    {cfg.prefix || ''}{inputs[cfg.key].toLocaleString()}{cfg.suffix || ''}
                  </span>
                </div>
                {cfg.type === 'slider' ? (
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step || 1}
                    value={inputs[cfg.key]}
                    onChange={(e) => updateInput(cfg.key, Number(e.target.value))}
                    disabled={readOnly}
                    className="w-full accent-[#1e3a5f]"
                  />
                ) : (
                  <input
                    type="number"
                    min={cfg.min}
                    max={cfg.max}
                    value={inputs[cfg.key]}
                    onChange={(e) => updateInput(cfg.key, Number(e.target.value))}
                    disabled={readOnly}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none disabled:bg-gray-100 text-gray-900"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Output panel */}
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Additional FTE / Year" value={String(outputs.additionalFTEPerYear)} highlight />
            <KpiCard label="Total Annual Savings" value={USD(outputs.totalAnnualSavings)} highlight />
            <KpiCard label="Cost Reduction %" value={`${outputs.costReductionPercent}%`} highlight />
            <KpiCard label="Profit Impact %" value={`${outputs.profitImpactPercent}%`} highlight />
            <KpiCard label="Recruiting Saved" value={USD(outputs.recruitingCostSaved)} />
            <KpiCard label="Retention Savings" value={USD(outputs.retentionSavings)} />
            <KpiCard label="Ops Efficiency" value={USD(outputs.opsEfficiencySaving)} />
            <KpiCard label="Growth Capacity Index" value={String(outputs.growthCapacityIndex)} />
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current vs Projected</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Current" fill="#6b7280" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Projected" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Savings Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [USD(Number(value)), '']} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Assumptions */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-500">
            <p className="font-semibold text-gray-600 mb-1">Assumptions</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Recruiting cost savings assume 70% of agency cost saved per internal hire</li>
              <li>Ops efficiency assumes 15% automation savings on baseline talent ops cost</li>
              <li>Growth capacity = target FTE production / (current headcount x growth target)</li>
              <li>Profit impact = cost reduction % x margin assumption</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-800 border-gray-200'}`}>
      <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-xl font-bold ${highlight ? '' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}
