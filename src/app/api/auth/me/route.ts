import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { getUserById } from '@/services/auth.service';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await getUserById(payload.userId);

    if (user) {
      return NextResponse.json({ user });
    }

    // Fallback: DB lookup failed (e.g. serverless cold start with stale DB).
    // Return claims from the verified JWT so the session stays alive.
    return NextResponse.json({
      user: {
        id: payload.userId,
        email: '',
        role: payload.role,
        personId: payload.personId || null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  return NextResponse.json({ success: true });
}
