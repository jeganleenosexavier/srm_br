import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { calculateBadge } from '@/services/compliance.service';
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

  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, name: true, region: true, type: true, payBand: true, payEquityStatus: true },
  });

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  const items = await prisma.complianceItem.findMany({
    where: { personId: id },
    orderBy: { itemType: 'asc' },
  });

  const country = await prisma.country.findUnique({ where: { code: person.region } });
  const badge = calculateBadge(items);

  return NextResponse.json({
    person: { id: person.id, name: person.name, region: person.region, type: person.type, payBand: person.payBand, payEquityStatus: person.payEquityStatus },
    country,
    badge,
    items: items.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      status: item.status,
      expiryDate: item.expiryDate?.toISOString() || null,
    })),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { itemId, status, expiryDate } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null;

    await prisma.complianceItem.update({
      where: { id: itemId },
      data,
    });

    // Recalculate badge
    const items = await prisma.complianceItem.findMany({
      where: { personId: id },
    });
    const badge = calculateBadge(items);

    await prisma.person.update({
      where: { id },
      data: { complianceStatus: badge.level },
    });

    return NextResponse.json({ success: true, badge });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
