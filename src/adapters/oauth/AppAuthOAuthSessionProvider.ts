import {
  authorize,
  refresh as appAuthRefresh,
  revoke as appAuthRevoke,
  type AppAuthError,
} from 'react-native-app-auth';

import { googleOAuthConfig } from '@/config/googleOAuth';
import type {
  OAuthSession,
  OAuthSessionProvider,
} from '@/domain/ports/OAuthSessionProvider';

/**
 * Concrete OAuthSessionProvider backed by react-native-app-auth
 * (docs/decisions/ADR-002-oauth-library.md). Translates the library's
 * AuthorizeResult/RefreshResult shapes into the domain's OAuthSession, and
 * normalizes AppAuth's typed error codes into something usecases can
 * branch on without importing react-native-app-auth themselves.
 *
 * VERIFIED ON DEVICE (17/10/2026, release build only): authorize() was
 * exercised end-to-end on a real Android device — Custom Tab opened,
 * redirect round-tripped, tokens were received. Getting there required
 * enabling "Custom URI scheme" under Advanced Settings on the release
 * Client ID in Google Cloud Console (off by default for Android OAuth
 * clients created after Oct 2023 — see the ADR-004 addendum for the
 * full story and sources). The debug Client ID was created after that
 * same date and likely needs the same toggle — NOT YET VERIFIED for the
 * debug build variant, and New Architecture compatibility (ADR-002)
 * hasn't been specifically exercised either.
 */
export class AppAuthOAuthSessionProvider implements OAuthSessionProvider {
  async authorize(): Promise<OAuthSession> {
    try {
      const result = await authorize(googleOAuthConfig);
      return {
        accessToken: result.accessToken,
        accessTokenExpiresAt: new Date(result.accessTokenExpirationDate),
        refreshToken: result.refreshToken,
      };
    } catch (error) {
      throw toOAuthError(error, 'authorize');
    }
  }

  async refresh(refreshToken: string): Promise<OAuthSession> {
    try {
      const result = await appAuthRefresh(googleOAuthConfig, { refreshToken });
      return {
        accessToken: result.accessToken,
        accessTokenExpiresAt: new Date(result.accessTokenExpirationDate),
        // Google may or may not rotate the refresh token on refresh; when
        // it doesn't, the library returns null here. Callers (TokenStore)
        // must keep the original refreshToken in that case — this
        // provider doesn't own persistence, so it surfaces exactly what
        // AppAuth returned rather than guessing.
        refreshToken: result.refreshToken ?? refreshToken,
      };
    } catch (error) {
      throw toOAuthError(error, 'refresh');
    }
  }

  async revoke(refreshToken: string): Promise<void> {
    try {
      await appAuthRevoke(googleOAuthConfig, { tokenToRevoke: refreshToken });
    } catch (error) {
      throw toOAuthError(error, 'revoke');
    }
  }
}

/**
 * Whether this error represents an invalid/expired/revoked refresh token
 * (RFC 6749 §5.2 `invalid_grant` — the case this app must treat as
 * "session expired, sign in again" rather than retrying, per
 * docs/SPEC.md section 15: "Não repetir uma escrita após timeout sem
 * verificar se ela já foi concluída" and ADR-001's 7-day Testing-mode
 * expiry).
 */
export function isInvalidGrantError(error: unknown): boolean {
  return isAppAuthError(error) && error.code === 'invalid_grant';
}

/** Whether the user explicitly denied consent in the authorize() flow. */
export function isAccessDeniedError(error: unknown): boolean {
  return isAppAuthError(error) && error.code === 'access_denied';
}

function isAppAuthError(error: unknown): error is AppAuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

function toOAuthError(error: unknown, operation: string): Error {
  if (isAppAuthError(error)) {
    // Preserve the original AppAuthError (and its .code) rather than
    // wrapping it — callers need isInvalidGrantError/isAccessDeniedError
    // to keep working on whatever this throws.
    return error;
  }
  return new Error(
    `OAuthSessionProvider.${operation} failed with a non-AppAuth error: ${String(error)}`,
  );
}
