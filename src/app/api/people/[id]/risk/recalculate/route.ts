import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { calculateRisk } from '@/services/risk.engine';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const result = await calculateRisk(id);
    await prisma.person.update({
      where: { id },
      data: { riskLevel: result.level },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 });
  }
}
