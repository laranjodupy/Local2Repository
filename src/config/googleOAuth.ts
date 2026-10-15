/**
 * Google OAuth configuration for the YouTube Data API integration.
 *
 * None of this is a secret: Android installed apps don't receive (and
 * must not store) a client_secret (docs/SPEC.md sections 5.5/15). The
 * Client ID and redirect URL below are public identifiers tied to this
 * app's package name + signing certificate — see docs/OAUTH_SETUP.md for
 * how they were generated and docs/decisions/ADR-002-oauth-library.md for
 * why the redirect scheme is `com.googleusercontent.apps.<GUID>` rather
 * than the app's own package name (that's a Google convention, not ours).
 *
 * KNOWN LIMITATION: this Client ID is registered against one SHA-1 (the
 * debug keystore on Daniel's machine, see docs/OAUTH_SETUP.md section 3).
 * A release build signed with a different keystore will need either a
 * second registered SHA-1 on this same client, or a separate Client ID —
 * not yet decided, deferred to Fase 3/4.
 */

const GOOGLE_OAUTH_CLIENT_GUID =
  '542799348342-n53tu24i98chlh8oqhalfqqgm84uc4c9';

export const googleOAuthConfig = {
  issuer: 'https://accounts.google.com',
  clientId: `${GOOGLE_OAUTH_CLIENT_GUID}.apps.googleusercontent.com`,
  redirectUrl: `com.googleusercontent.apps.${GOOGLE_OAUTH_CLIENT_GUID}:/oauth2redirect/google`,
  /**
   * Full YouTube management scope — the narrowest scope confirmed to work
   * for search.list + playlists.insert + playlistItems.insert together.
   * Whether a narrower scope (if one exists) would also suffice was not
   * investigated (docs/OAUTH_SETUP.md section 5) — not blocking, since
   * this scope works and is what's configured in the Google Cloud
   * consent screen today.
   *
   * Typed as a mutable string[] (not `as const`) because
   * react-native-app-auth's AuthConfiguration.scopes expects string[],
   * not a readonly tuple.
   */
  scopes: ['https://www.googleapis.com/auth/youtube'] as string[],
};
