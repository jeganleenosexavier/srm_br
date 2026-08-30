export interface ImpactInputs {
  monthlyInternVolume: number;
  currentConversionPercent: number;
  targetConversionPercent: number;
  avgAgencyHireCost: number;
  currentRetentionPercent: number;
  targetRetentionPercent: number;
  avgReplacementCost: number;
  headcountGrowthTarget: number;
  baselineTalentOpsCost: number;
  marginAssumption: number;
}

export interface ImpactOutputs {
  additionalFTEPerYear: number;
  recruitingCostSaved: number;
  retentionSavings: number;
  opsEfficiencySaving: number;
  totalAnnualSavings: number;
  costReductionPercent: number;
  growthCapacityIndex: number;
  profitImpactPercent: number;
}

export const DEFAULT_INPUTS: ImpactInputs = {
  monthlyInternVolume: 100,
  currentConversionPercent: 8,
  targetConversionPercent: 15,
  avgAgencyHireCost: 8000,
  currentRetentionPercent: 85,
  targetRetentionPercent: 99,
  avgReplacementCost: 25000,
  headcountGrowthTarget: 60,
  baselineTalentOpsCost: 500000,
  marginAssumption: 30,
};

export const PRESETS: Record<string, Partial<ImpactInputs>> = {
  conservative: {
    targetConversionPercent: 12,
    targetRetentionPercent: 95,
    headcountGrowthTarget: 30,
  },
  base: {
    targetConversionPercent: 15,
    targetRetentionPercent: 99,
    headcountGrowthTarget: 60,
  },
  stretch: {
    targetConversionPercent: 25,
    targetRetentionPercent: 99,
    headcountGrowthTarget: 100,
  },
};

export function calculateImpact(inputs: ImpactInputs): ImpactOutputs {
  const annualVolume = inputs.monthlyInternVolume * 12;

  const currentFTE = annualVolume * (inputs.currentConversionPercent / 100);
  const targetFTE = annualVolume * (inputs.targetConversionPercent / 100);
  const additionalFTEPerYear = Math.round(targetFTE - currentFTE);

  // 70% of agency cost saved per additional internal hire
  const recruitingCostSaved = Math.round(additionalFTEPerYear * inputs.avgAgencyHireCost * 0.7);

  // Retention improvement across existing headcount
  const currentHeadcount = currentFTE;
  const retentionDelta = (inputs.targetRetentionPercent - inputs.currentRetentionPercent) / 100;
  const retentionSavings = Math.round(currentHeadcount * retentionDelta * inputs.avgReplacementCost);

  // 15% automation assumption
  const opsEfficiencySaving = Math.round(inputs.baselineTalentOpsCost * 0.15);

  const totalAnnualSavings = recruitingCostSaved + retentionSavings + opsEfficiencySaving;

  const costReductionPercent = inputs.baselineTalentOpsCost > 0
    ? Math.round((totalAnnualSavings / inputs.baselineTalentOpsCost) * 100)
    : 0;

  const growthCapacityIndex = currentHeadcount > 0 && inputs.headcountGrowthTarget > 0
    ? parseFloat((targetFTE / (currentHeadcount * (inputs.headcountGrowthTarget / 100))).toFixed(2))
    : 0;

  const profitImpactPercent = Math.round(costReductionPercent * (inputs.marginAssumption / 100));

  return {
    additionalFTEPerYear,
    recruitingCostSaved,
    retentionSavings,
    opsEfficiencySaving,
    totalAnnualSavings,
    costReductionPercent,
    growthCapacityIndex,
    profitImpactPercent,
  };
}
