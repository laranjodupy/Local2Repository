/**
 * Pure helpers for deriving a display file name from a SAF content:// (or
 * any URI-shaped) string. Extracted out of SafAudioLibraryProvider so this
 * one bit of actual logic in that adapter — the rest is native-module
 * plumbing not worth mocking — gets a real unit test (project convention:
 * only pure domain logic gets Jest tests; adapters are verified on a real
 * device via the /saf-spike screen, see docs/decisions/ADR-005-saf-library.md).
 */
export function fileNameFromUri(uri: string): string {
  const lastSegment = uri.split('/').pop();
  if (!lastSegment) {
    return uri;
  }
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    // Malformed percent-encoding (e.g. a lone "%" in a user-chosen file
    // name) would otherwise throw URIError and abort the whole scan.
    return lastSegment;
  }
}
