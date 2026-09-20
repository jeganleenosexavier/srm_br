import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { calculateRisk } from '@/services/risk.engine';
import { canAccessPerson } from '@/lib/access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role') || 'intern';
  const userPersonId = headersList.get('x-user-person-id');

  if (!(await canAccessPerson(role, userPersonId, id))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const result = await calculateRisk(id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to calculate risk' }, { status: 500 });
  }
}
