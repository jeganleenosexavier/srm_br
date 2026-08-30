import { NextResponse } from 'next/server';
import { calculateImpact, type ImpactInputs } from '@/services/impact.engine';

export async function POST(request: Request) {
  try {
    const inputs: ImpactInputs = await request.json();
    const outputs = calculateImpact(inputs);
    return NextResponse.json(outputs);
  } catch {
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
