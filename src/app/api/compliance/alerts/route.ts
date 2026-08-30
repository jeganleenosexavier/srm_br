import { NextResponse } from 'next/server';
import { getAlerts } from '@/services/compliance.service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || undefined;
  const type = searchParams.get('type') || undefined;
  const urgency = searchParams.get('urgency') || undefined;

  try {
    const alerts = await getAlerts({ country, type, urgency });
    return NextResponse.json(alerts);
  } catch {
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
  }
}
