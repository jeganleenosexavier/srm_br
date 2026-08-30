import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const projects = await prisma.project.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(projects);
}
