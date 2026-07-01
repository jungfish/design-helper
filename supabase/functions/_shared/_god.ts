// Comptes "god" : accès et droits (visibilité + suppression) sur tous les appartements.
export const GOD_USER_IDS = [
  "60169a61-a222-4479-b9d1-fa861a7dc2fb", // matjungfer@gmail.com
];

export function isGodUser(userId: string): boolean {
  return GOD_USER_IDS.includes(userId);
}
