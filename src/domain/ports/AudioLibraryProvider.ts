import type { AudioFileEntry, AudioMetadata } from '@/domain/models/AudioFile';

/**
 * Result of asking the user to pick a folder via SAF
 * (docs/decisions/ADR-005-saf-library.md).
 */
export type DirectoryPickResult =
  | { granted: true; directoryUri: string }
  | { granted: false };

/**
 * Abstraction over "pick a folder, list what's in it, read tags from a
 * file" — the three operations the SAF spike (docs/SPEC.md section 5.1
 * "Validar") exercises together. Kept as one port rather than two so a
 * usecase can depend on a single thing for "the user's local music", per
 * the Clean-ish layering already used for OAuth
 * (src/domain/ports/OAuthSessionProvider.ts).
 *
 * `listFilesRecursively` is NOT a single native call on any backing
 * library investigated so far (ADR-005) — every option found requires
 * walking subdirectories manually by calling the flat listing repeatedly.
 * That walk belongs in the adapter, not duplicated by every usecase.
 */
export interface AudioLibraryProvider {
  /** Opens the native folder picker (ACTION_OPEN_DOCUMENT_TREE under the hood). */
  pickDirectory(): Promise<DirectoryPickResult>;

  /**
   * Lists every file found under `directoryUri`, recursing into
   * subdirectories. Returns only entries that look like files (not bare
   * subdirectory markers) — subdirectories are walked internally, not
   * surfaced to the caller.
   *
   * NOT YET VERIFIED (ADR-005): time/memory behavior at 1,000 and 10,000
   * files is unmeasured. If this turns out too slow, the SPEC's fallback
   * is a native Kotlin module using DocumentsContract directly — this
   * interface would stay the same, only the adapter would change.
   */
  listFilesRecursively(directoryUri: string): Promise<AudioFileEntry[]>;

  /**
   * Reads tag/format metadata for one file by its SAF content:// URI.
   * Returns null fields rather than throwing when a particular tag is
   * missing or unparseable — only throws for genuine I/O failure (file
   * became inaccessible, permission revoked).
   */
  readMetadata(uri: string): Promise<AudioMetadata>;
}
