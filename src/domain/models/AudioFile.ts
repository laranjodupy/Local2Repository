/**
 * A single file found while listing a SAF-chosen directory tree, before any
 * metadata has been read from it.
 *
 * `uri` is the full SAF URI (content://...) as returned by the directory
 * listing — this is what gets passed to the metadata reader later, not a
 * file:// path (SAF doesn't expose real filesystem paths; see
 * docs/decisions/ADR-005-saf-library.md).
 */
export interface AudioFileEntry {
  uri: string;
  name: string;
  /** MIME type as reported by SAF, when available (may be generic/absent). */
  mimeType: string | null;
  /** Size in bytes as reported by SAF, when available. */
  size: number | null;
}

/**
 * Tag/format metadata extracted from one audio file. Fields are optional
 * because real-world files are frequently missing tags, have broken
 * encodings, or use formats the retriever can't fully parse — the domain
 * must tolerate partial data rather than assume every field is present
 * (docs/SPEC.md section 5.3 "Validar": "arquivos sem tag e tags com
 * codificação quebrada").
 */
export interface AudioMetadata {
  title: string | null;
  artist: string | null;
  albumTitle: string | null;
  albumArtist: string | null;
  trackNumber: number | null;
  year: number | null;
  /**
   * NOT VERIFIED (docs/decisions/ADR-006-metadata-library.md): no duration
   * field is documented on the underlying library. Left here as the
   * expected shape; populate once the spike confirms whether/how duration
   * can be derived (e.g. from a separate Media3 call), or drop it if it
   * turns out not to be obtainable without decoding the file.
   */
  durationMs: number | null;
}
