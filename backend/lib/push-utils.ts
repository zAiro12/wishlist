export function getActorDisplayName(user: {
  givenName: string | null;
  familyName: string | null;
  email: string;
}): string {
  return user.givenName?.trim() || user.familyName?.trim() || user.email;
}
