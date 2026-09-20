import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import type { AuthUser } from '@/lib/types';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function authenticate(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const token = await signToken({
    userId: user.id,
    role: user.role as AuthUser['role'],
    personId: user.personId || null,
  });

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role as AuthUser['role'], personId: user.personId || null },
  };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return { id: user.id, email: user.email, role: user.role as AuthUser['role'], personId: user.personId || null };
}
