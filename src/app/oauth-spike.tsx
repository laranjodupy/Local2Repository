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

import {
  AppAuthOAuthSessionProvider,
  isAccessDeniedError,
  isInvalidGrantError,
} from '@/adapters/oauth/AppAuthOAuthSessionProvider';
import type { OAuthSession } from '@/domain/ports/OAuthSessionProvider';

/**
 * Fase 0 spike screen — NOT part of the final app flow (docs/SPEC.md
 * section 13). Exercises AppAuthOAuthSessionProvider end-to-end
 * (authorize → refresh → revoke) against a real Google account, with
 * every result/error shown on screen rather than relying on a connected
 * debugger, since this is meant to be run on-device by hand.
 *
 * Requires a development build (expo prebuild + expo run:android) — the
 * native AppAuth module is not present in Expo Go, so authorize() will
 * throw/crash there. See docs/OAUTH_SETUP.md.
 *
 * Reachable at /oauth-spike (Expo Router file-based route). Not linked
 * from the home screen on purpose, to avoid it looking like a finished
 * feature.
 */

type SpikeState =
  | { kind: 'idle' }
  | { kind: 'working'; action: 'authorize' | 'refresh' | 'revoke' }
  | { kind: 'session'; session: OAuthSession }
  | { kind: 'revoked' }
  | { kind: 'error'; action: string; message: string; isAccessDenied: boolean; isInvalidGrant: boolean };

const provider = new AppAuthOAuthSessionProvider();

export default function OAuthSpikeScreen() {
  const { t } = useTranslation();
  const [state, setState] = useState<SpikeState>({ kind: 'idle' });

  const handleAuthorize = useCallback(async () => {
    setState({ kind: 'working', action: 'authorize' });
    try {
      const session = await provider.authorize();
      setState({ kind: 'session', session });
    } catch (error) {
      setState({
        kind: 'error',
        action: 'authorize',
        message: describeError(error),
        isAccessDenied: isAccessDeniedError(error),
        isInvalidGrant: isInvalidGrantError(error),
      });
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (state.kind !== 'session') return;
    const { refreshToken } = state.session;
    setState({ kind: 'working', action: 'refresh' });
    try {
      const session = await provider.refresh(refreshToken);
      setState({ kind: 'session', session });
    } catch (error) {
      setState({
        kind: 'error',
        action: 'refresh',
        message: describeError(error),
        isAccessDenied: isAccessDeniedError(error),
        isInvalidGrant: isInvalidGrantError(error),
      });
    }
  }, [state]);

  const handleRevoke = useCallback(async () => {
    if (state.kind !== 'session') return;
    const { refreshToken } = state.session;
    setState({ kind: 'working', action: 'revoke' });
    try {
      await provider.revoke(refreshToken);
      setState({ kind: 'revoked' });
    } catch (error) {
      setState({
        kind: 'error',
        action: 'revoke',
        message: describeError(error),
        isAccessDenied: isAccessDeniedError(error),
        isInvalidGrant: isInvalidGrantError(error),
      });
    }
  }, [state]);

  const isWorking = state.kind === 'working';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('oauthSpike.title')}</Text>
      <Text style={styles.subtitle}>{t('oauthSpike.subtitle')}</Text>

      <Pressable
        style={[styles.button, isWorking && styles.buttonDisabled]}
        disabled={isWorking}
        onPress={handleAuthorize}
        accessibilityRole="button"
        accessibilityLabel={t('oauthSpike.signInButton')}
      >
        <Text style={styles.buttonText}>{t('oauthSpike.signInButton')}</Text>
      </Pressable>

      {state.kind === 'session' && (
        <>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel={t('oauthSpike.refreshButton')}
          >
            <Text style={styles.buttonText}>{t('oauthSpike.refreshButton')}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonDanger]}
            onPress={handleRevoke}
            accessibilityRole="button"
            accessibilityLabel={t('oauthSpike.revokeButton')}
          >
            <Text style={styles.buttonText}>{t('oauthSpike.revokeButton')}</Text>
          </Pressable>
        </>
      )}

      <View style={styles.resultBox}>{renderResult(state, t)}</View>
    </ScrollView>
  );
}

function renderResult(
  state: SpikeState,
  t: (key: string) => string,
): React.ReactNode {
  switch (state.kind) {
    case 'idle':
      return <Text style={styles.resultText}>{t('oauthSpike.noSession')}</Text>;

    case 'working':
      return (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.resultText}>
            {t(
              state.action === 'authorize'
                ? 'oauthSpike.signingIn'
                : state.action === 'refresh'
                  ? 'oauthSpike.refreshing'
                  : 'oauthSpike.revoking',
            )}
          </Text>
        </View>
      );

    case 'session':
      return (
        <>
          <Text style={styles.resultLabel}>{t('oauthSpike.sessionLabel')}</Text>
          <Text style={styles.resultText}>
            {t('oauthSpike.accessTokenLabel')}: {truncate(state.session.accessToken)}
          </Text>
          <Text style={styles.resultText}>
            {t('oauthSpike.accessTokenExpiresLabel')}:{' '}
            {state.session.accessTokenExpiresAt.toISOString()}
          </Text>
          <Text style={styles.resultText}>
            {t('oauthSpike.refreshTokenLabel')}: {truncate(state.session.refreshToken)}
          </Text>
        </>
      );

    case 'revoked':
      return <Text style={styles.resultText}>{t('oauthSpike.revokedMessage')}</Text>;

    case 'error':
      return (
        <>
          <Text style={[styles.resultLabel, styles.errorLabel]}>
            {t('oauthSpike.errorLabel')} ({state.action})
          </Text>
          <Text style={styles.resultText}>
            {state.isAccessDenied
              ? t('oauthSpike.errorAccessDenied')
              : state.isInvalidGrant
                ? t('oauthSpike.errorInvalidGrant')
                : t('oauthSpike.errorGeneric')}
          </Text>
          <Text style={styles.resultTextMono}>{state.message}</Text>
        </>
      );
  }
}

/**
 * Only show the first/last few characters — this screen may be visible
 * during screen-sharing while debugging, and these are live credentials
 * for a real Google account (docs/SPEC.md section 10: never log full
 * tokens).
 */
function truncate(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return code ? `[${String(code)}] ${error.message}` : error.message;
  }
  return String(error);
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
  buttonSecondary: {
    backgroundColor: '#475569',
  },
  buttonDanger: {
    backgroundColor: '#b91c1c',
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
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
