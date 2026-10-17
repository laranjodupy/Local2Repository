/**
 * Google OAuth config for the DEBUG build variant (gradlew assembleDebug),
 * signed with ~/.android/debug.keystore (docs/OAUTH_SETUP.md section 3).
 *
 * This Client ID is registered in Google Cloud Console against that
 * debug keystore's SHA-1:
 *   50:2B:95:DE:A8:87:C5:22:ED:92:0A:FF:B7:CC:2B:E2:42:17:F7:38
 *
 * Do not use this config for an assembleRelease build — the redirect
 * will not round-trip because Google validates the SHA-1 of the APK
 * that opened the Custom Tab against the one registered for this
 * specific Client ID. See googleOAuth.ts for how the right file gets
 * picked, and googleOAuth.release.ts for the release counterpart.
 */

const GOOGLE_OAUTH_CLIENT_GUID_DEBUG =
  '542799348342-n53tu24i98chlh8oqhalfqqgm84uc4c9';

export const googleOAuthConfigDebug = {
  issuer: 'https://accounts.google.com',
  clientId: `${GOOGLE_OAUTH_CLIENT_GUID_DEBUG}.apps.googleusercontent.com`,
  redirectUrl: `com.googleusercontent.apps.${GOOGLE_OAUTH_CLIENT_GUID_DEBUG}:/oauth2redirect/google`,
  /**
   * Full YouTube management scope — the narrowest scope confirmed to work
   * for search.list + playlists.insert + playlistItems.insert together
   * (docs/OAUTH_SETUP.md section 5).
   *
   * Typed as a mutable string[] (not `as const`) because
   * react-native-app-auth's AuthConfiguration.scopes expects string[],
   * not a readonly tuple (see the readonly-tuple bug logged in the
   * retrospective doc).
   */
  scopes: ['https://www.googleapis.com/auth/youtube'] as string[],
};
