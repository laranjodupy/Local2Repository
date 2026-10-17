import Constants from 'expo-constants';

import { googleOAuthConfigDebug } from './googleOAuth.debug';
import { googleOAuthConfigRelease } from './googleOAuth.release';

/**
 * Google OAuth configuration for the YouTube Data API integration,
 * selected by build variant.
 *
 * None of this is a secret: Android installed apps don't receive (and
 * must not store) a client_secret (docs/SPEC.md sections 5.5/15). The
 * Client ID and redirect URL are public identifiers tied to this app's
 * package name + signing certificate — see docs/OAUTH_SETUP.md for how
 * they were generated and docs/decisions/ADR-002-oauth-library.md for
 * why the redirect scheme is `com.googleusercontent.apps.<GUID>` rather
 * than the app's own package name (that's a Google convention, not
 * ours).
 *
 * WHY TWO CONFIGS: Google validates an OAuth Client ID against the exact
 * SHA-1 of the certificate that signed the APK making the request. A
 * debug build (signed with ~/.android/debug.keystore) and a release
 * build (signed with ~/.android/release.keystore) have different SHA-1s,
 * so each needs its own registered Client ID in Google Cloud Console —
 * see docs/decisions/ADR-004-release-oauth-client.md. There is no way to
 * detect "is this APK signed with the debug or release key" from JS at
 * runtime (no library for that is installed in this project, and adding
 * one just for this was judged unnecessary scope). Instead, the variant
 * is decided at BUILD time via the APP_VARIANT environment variable,
 * which app.config.js reads and embeds into Constants.expoConfig.extra.
 *
 * HOW TO BUILD EACH VARIANT:
 *   Debug:   (no env var needed — "debug" is the default)
 *            npx expo prebuild --clean && cd android && gradlew assembleDebug
 *   Release: APP_VARIANT=release npx expo prebuild --clean && cd android && gradlew assembleRelease
 *
 * If APP_VARIANT is omitted or misspelled, this defaults to "debug"
 * rather than throwing, since debug is the safer default while this is
 * still Fase 0 (nobody is distributing a release build yet) — but a
 * release build accidentally carrying the debug Client ID would just
 * fail at the OAuth redirect step with an invalid_client-ish error, not
 * silently misbehave.
 */
const variant = Constants.expoConfig?.extra?.appVariant === 'release'
  ? 'release'
  : 'debug';

export const googleOAuthConfig =
  variant === 'release' ? googleOAuthConfigRelease : googleOAuthConfigDebug;
