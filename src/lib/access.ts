import { prisma } from '@/lib/prisma';

/**
 * Check if a mentor (identified by their personId) is assigned as the mentor
 * for the given target person.
 */
export async function isAssignedIntern(
  mentorPersonId: string,
  targetPersonId: string
): Promise<boolean> {
  const person = await prisma.person.findFirst({
    where: { id: targetPersonId, mentorId: mentorPersonId },
    select: { id: true },
  });
  return !!person;
}

/**
 * Check if the requesting user can access a specific person's data.
 * - Admin: always allowed
 * - Mentor: allowed for own personId or assigned interns
 * - Intern: allowed only for own personId
 */
export async function canAccessPerson(
  role: string,
  userPersonId: string | null,
  targetPersonId: string
): Promise<boolean> {
  if (role === 'admin') return true;

  if (!userPersonId) return false;

  if (userPersonId === targetPersonId) return true;

  if (role === 'mentor') {
    return isAssignedIntern(userPersonId, targetPersonId);
  }

  return false;
}

/**
 * Check if the requesting user can write/modify a specific person's data.
 * - Admin: always allowed
 * - Mentor: allowed only for assigned interns (not self)
 * - Intern: never allowed
 */
export async function canModifyPerson(
  role: string,
  userPersonId: string | null,
  targetPersonId: string
): Promise<boolean> {
  if (role === 'admin') return true;

  if (role === 'mentor' && userPersonId) {
    return isAssignedIntern(userPersonId, targetPersonId);
  }

  return false;
}
