import { NextResponse } from 'next/server';
import { getCountrySummaries } from '@/services/compliance.service';

export async function GET() {
  try {
    const summaries = await getCountrySummaries();
    return NextResponse.json(summaries);
  } catch {
    return NextResponse.json({ error: 'Failed to load compliance data' }, { status: 500 });
  }
}
