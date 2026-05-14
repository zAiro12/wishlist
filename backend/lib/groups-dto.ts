import type { Prisma } from '@prisma/client';

type GroupUserSelectOptions = {
  includeBirthdate?: boolean;
};

export function buildGroupUserSelect(
  canViewEmail: boolean,
  options: GroupUserSelectOptions = {}
): Prisma.UserSelect {
  const { includeBirthdate = false } = options;
  return {
    id: true,
    givenName: true,
    familyName: true,
    ...(includeBirthdate ? { birthdate: true } : {}),
    ...(canViewEmail ? { email: true } : {}),
  };
}
