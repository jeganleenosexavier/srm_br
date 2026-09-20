import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getCountrySummaries } from '@/services/compliance.service';

export async function GET() {
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const summaries = await getCountrySummaries();
    return NextResponse.json(summaries);
  } catch {
    return NextResponse.json({ error: 'Failed to load compliance data' }, { status: 500 });
  }
}
