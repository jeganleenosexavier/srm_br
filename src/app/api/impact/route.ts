import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { calculateImpact, type ImpactInputs } from '@/services/impact.engine';

export async function POST(request: Request) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const inputs: ImpactInputs = await request.json();
    const outputs = calculateImpact(inputs);
    return NextResponse.json(outputs);
  } catch {
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
