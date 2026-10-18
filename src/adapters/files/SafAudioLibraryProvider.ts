import * as FileSystem from 'expo-file-system/legacy';
import { getMetadata } from '@missingcore/react-native-metadata-retriever';

import type { AudioFileEntry, AudioMetadata } from '@/domain/models/AudioFile';
import { fileNameFromUri } from '@/domain/models/safUri';
import type {
  AudioLibraryProvider,
  DirectoryPickResult,
} from '@/domain/ports/AudioLibraryProvider';

/**
 * AudioLibraryProvider backed by expo-file-system's StorageAccessFramework
 * namespace (ADR-005) for folder picking/listing, and
 * @missingcore/react-native-metadata-retriever (ADR-006) for tag reading.
 *
 * NOT YET VERIFIED ON DEVICE: this is the Fase 0 spike implementation.
 * Specifically unverified: recursive-listing performance at scale (1,000+
 * files), whether content:// URIs round-trip correctly through the
 * metadata reader for every format in docs/SPEC.md section 5.3, and
 * whether getInfoAsync's isDirectory check is reliable for every SAF
 * provider (tested only against local storage so far, not an SD card or
 * a third-party document provider — see docs/SPEC.md section 5.2
 * "Validar").
 */
export class SafAudioLibraryProvider implements AudioLibraryProvider {
  async pickDirectory(): Promise<DirectoryPickResult> {
    const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!result.granted) {
      return { granted: false };
    }
    return { granted: true, directoryUri: result.directoryUri };
  }

  async listFilesRecursively(directoryUri: string): Promise<AudioFileEntry[]> {
    const entries: AudioFileEntry[] = [];
    await this.walk(directoryUri, entries);
    return entries;
  }

  private async walk(directoryUri: string, out: AudioFileEntry[]): Promise<void> {
    const childUris = await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);

    // Sequential, not Promise.all: a directory with thousands of entries
    // would otherwise fire thousands of concurrent getInfoAsync calls at
    // once. Whether this needs batching/concurrency limiting instead is
    // exactly what the spike's timing measurement is for (ADR-005).
    for (const childUri of childUris) {
      const info = await FileSystem.getInfoAsync(childUri);
      if (!info.exists) {
        // Shouldn't normally happen right after a listing, but SAF
        // providers can be inconsistent (e.g. a file deleted mid-scan).
        continue;
      }
      if (info.isDirectory) {
        await this.walk(childUri, out);
        continue;
      }
      out.push({
        uri: childUri,
        name: fileNameFromUri(childUri),
        mimeType: null, // getInfoAsync doesn't report MIME; not worth a second call here.
        size: info.size,
      });
    }
  }

  async readMetadata(uri: string): Promise<AudioMetadata> {
    const fields = [
      'title',
      'artist',
      'albumTitle',
      'albumArtist',
      'trackNumber',
      'year',
    ] as const;

    const result = await getMetadata(uri, fields);

    return {
      title: result.title ?? null,
      artist: result.artist ?? null,
      albumTitle: result.albumTitle ?? null,
      albumArtist: result.albumArtist ?? null,
      trackNumber: result.trackNumber ?? null,
      year: result.year ?? null,
      // No duration field exists on this library (ADR-006) — left null
      // until the spike settles whether/how to derive it.
      durationMs: null,
    };
  }
}
