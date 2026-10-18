import { fileNameFromUri } from './safUri';

describe('fileNameFromUri', () => {
  it('decodes a percent-encoded file name from a SAF content:// URI', () => {
    // Real SAF document IDs encode the full relative path after "document/"
    // as one URI-encoded segment (e.g. "primary:Music/Queen - ....mp3"), not
    // just the bare file name — split('/') only cuts on the URI's own
    // slashes, so the decoded %2F for the path separator stays in the result.
    // That matches what the provider actually needs: a readable label, not
    // a guarantee of no slashes.
    const uri =
      'content://com.android.externalstorage.documents/tree/primary%3AMusic/document/primary%3AMusic%2FQueen%20-%20Bohemian%20Rhapsody.mp3';
    expect(fileNameFromUri(uri)).toBe('primary:Music/Queen - Bohemian Rhapsody.mp3');
  });

  it('decodes a simple percent-encoded file name with no further path separators', () => {
    const uri = 'content://example/tree/x/document/Queen%20-%20Bohemian%20Rhapsody.mp3';
    expect(fileNameFromUri(uri)).toBe('Queen - Bohemian Rhapsody.mp3');
  });

  it('returns the raw last segment when decoding would throw (malformed percent-encoding)', () => {
    // A lone "%" not followed by two hex digits is invalid percent-encoding
    // and makes decodeURIComponent throw a URIError if called unguarded —
    // this is the real-world case (e.g. a file named "100% Pure.mp3" synced
    // by a tool that encodes the space but not the "%") this guard exists for.
    const malformedUri = 'content://example/tree/x/document/100%Pure.mp3';
    expect(() => fileNameFromUri(malformedUri)).not.toThrow();
    expect(fileNameFromUri(malformedUri)).toBe('100%Pure.mp3');
  });

  it('falls back to the full string when there is no "/" segment', () => {
    expect(fileNameFromUri('just-a-name.mp3')).toBe('just-a-name.mp3');
  });

  it('handles a trailing slash by returning an empty-segment fallback of the full uri', () => {
    expect(fileNameFromUri('content://example/tree/x/document/')).toBe(
      'content://example/tree/x/document/',
    );
  });
});
