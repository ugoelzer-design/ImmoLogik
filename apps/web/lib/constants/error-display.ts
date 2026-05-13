export const DEFAULT_ERROR_MESSAGE =
  "Die Daten konnten nicht geladen werden. Bitte versuche es erneut oder kontaktiere den Support.";

export function getSectionErrorTitle(section: string) {
  return `Fehler beim Laden: ${section}`;
}
