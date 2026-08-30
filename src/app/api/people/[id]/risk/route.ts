import { NextResponse } from 'next/server';
import { calculateRisk } from '@/services/risk.engine';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await calculateRisk(id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to calculate risk' }, { status: 500 });
  }
}
