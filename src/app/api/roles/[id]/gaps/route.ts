import { NextResponse } from 'next/server';
import { analyzeTeamGap } from '@/services/gap.engine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || undefined;

  try {
    const result = await analyzeTeamGap(id, region);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to analyze gaps' }, { status: 500 });
  }
}
