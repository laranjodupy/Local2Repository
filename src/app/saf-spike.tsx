import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafAudioLibraryProvider } from '@/adapters/files/SafAudioLibraryProvider';
import type { AudioFileEntry, AudioMetadata } from '@/domain/models/AudioFile';

/**
 * Fase 0 spike screen — NOT part of the final app flow (docs/SPEC.md
 * section 13). Exercises SafAudioLibraryProvider end-to-end: pick a
 * folder, list it recursively (timed), and read tags from each file
 * found, so the measurements docs/SPEC.md section 13 asks for (tempo de
 * listagem, formatos de tag lidos) come from a real device, not theory.
 *
 * Requires a development build — expo-file-system's StorageAccessFramework
 * and the metadata retriever are native modules not present in Expo Go.
 *
 * Reachable at /saf-spike (Expo Router file-based route). Not linked from
 * the home screen on purpose, same as /oauth-spike.
 */

type FileResult = {
  entry: AudioFileEntry;
  metadata: AudioMetadata | null;
  error: string | null;
};

type SpikeState =
  | { kind: 'idle' }
  | { kind: 'picking' }
  | { kind: 'listing' }
  | { kind: 'reading'; done: number; total: number }
  | {
      kind: 'done';
      directoryUri: string;
      listMs: number;
      readMs: number;
      results: FileResult[];
    }
  | { kind: 'error'; message: string };

const provider = new SafAudioLibraryProvider();

export default function SafSpikeScreen() {
  const { t } = useTranslation();
  const [state, setState] = useState<SpikeState>({ kind: 'idle' });

  const handlePickAndScan = useCallback(async () => {
    setState({ kind: 'picking' });
    try {
      const pick = await provider.pickDirectory();
      if (!pick.granted) {
        setState({ kind: 'idle' });
        return;
      }

      setState({ kind: 'listing' });
      const listStart = Date.now();
      const entries = await provider.listFilesRecursively(pick.directoryUri);
      const listMs = Date.now() - listStart;

      const results: FileResult[] = [];
      const readStart = Date.now();
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setState({ kind: 'reading', done: i, total: entries.length });
        try {
          const metadata = await provider.readMetadata(entry.uri);
          results.push({ entry, metadata, error: null });
        } catch (error) {
          results.push({
            entry,
            metadata: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      const readMs = Date.now() - readStart;

      setState({
        kind: 'done',
        directoryUri: pick.directoryUri,
        listMs,
        readMs,
        results,
      });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const isBusy =
    state.kind === 'picking' || state.kind === 'listing' || state.kind === 'reading';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('safSpike.title')}</Text>
      <Text style={styles.subtitle}>{t('safSpike.subtitle')}</Text>

      <Pressable
        style={[styles.button, isBusy && styles.buttonDisabled]}
        disabled={isBusy}
        onPress={handlePickAndScan}
        accessibilityRole="button"
        accessibilityLabel={t('safSpike.pickButton')}
      >
        <Text style={styles.buttonText}>{t('safSpike.pickButton')}</Text>
      </Pressable>

      <View style={styles.resultBox}>{renderResult(state, t)}</View>
    </ScrollView>
  );
}

function renderResult(
  state: SpikeState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): React.ReactNode {
  switch (state.kind) {
    case 'idle':
      return <Text style={styles.resultText}>{t('safSpike.noScan')}</Text>;

    case 'picking':
      return (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.resultText}>{t('safSpike.picking')}</Text>
        </View>
      );

    case 'listing':
      return (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.resultText}>{t('safSpike.listing')}</Text>
        </View>
      );

    case 'reading':
      return (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.resultText}>
            {t('safSpike.reading', { done: state.done, total: state.total })}
          </Text>
        </View>
      );

    case 'done': {
      const errorCount = state.results.filter((r) => r.error !== null).length;
      return (
        <>
          <Text style={styles.resultLabel}>{t('safSpike.summaryLabel')}</Text>
          <Text style={styles.resultText}>
            {t('safSpike.fileCount', { count: state.results.length })}
          </Text>
          <Text style={styles.resultText}>
            {t('safSpike.listTime', { ms: state.listMs })}
          </Text>
          <Text style={styles.resultText}>
            {t('safSpike.readTime', { ms: state.readMs })}
          </Text>
          {errorCount > 0 && (
            <Text style={[styles.resultText, styles.errorLabel]}>
              {t('safSpike.errorCount', { count: errorCount })}
            </Text>
          )}
          <View style={styles.divider} />
          {state.results.map((r) => (
            <View key={r.entry.uri} style={styles.fileRow}>
              <Text style={styles.resultTextMono} numberOfLines={1}>
                {r.entry.name}
              </Text>
              {r.error ? (
                <Text style={[styles.resultTextMono, styles.errorLabel]}>
                  {t('safSpike.fileError')}: {r.error}
                </Text>
              ) : (
                <Text style={styles.resultTextMono}>
                  {r.metadata?.title ?? '—'} / {r.metadata?.artist ?? '—'} /{' '}
                  {r.metadata?.albumTitle ?? '—'}
                </Text>
              )}
            </View>
          ))}
        </>
      );
    }

    case 'error':
      return (
        <>
          <Text style={[styles.resultLabel, styles.errorLabel]}>
            {t('safSpike.errorLabel')}
          </Text>
          <Text style={styles.resultTextMono}>{state.message}</Text>
        </>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  resultLabel: {
    fontWeight: '700',
    fontSize: 14,
  },
  errorLabel: {
    color: '#b91c1c',
  },
  resultText: {
    fontSize: 13,
  },
  resultTextMono: {
    fontSize: 11,
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 8,
  },
  fileRow: {
    gap: 2,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
});
