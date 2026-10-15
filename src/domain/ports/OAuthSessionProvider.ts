/**
 * Port for obtaining and managing an OAuth session against the YouTube Data
 * API, decoupled from the concrete library (react-native-app-auth — see
 * docs/decisions/ADR-002-oauth-library.md) so domain/usecases never import
 * react-native or the native AppAuth bridge directly.
 *
 * The app requests the narrowest write scope the endpoints accept
 * (docs/SPEC.md section 5.5/9). Today that is
 * `https://www.googleapis.com/auth/youtube` (confirmed sensitive scope,
 * see docs/OAUTH_SETUP.md) — covers search.list, playlists.insert and
 * playlistItems.insert.
 *
 * Tokens are never persisted by this port's caller directly: see
 * TokenStore (not yet defined) for the Keystore-backed storage boundary
 * (docs/SPEC.md section 5.6/15 — refresh token + expiry only, never
 * id_token, access token kept in memory only).
 */
export interface OAuthSession {
  /** Short-lived; safe to hold in memory only, never persisted. */
  readonly accessToken: string;
  /** Instant after which accessToken must be refreshed. */
  readonly accessTokenExpiresAt: Date;
  /**
   * Long-lived credential. In "Testing" consent screen status this expires
   * after 7 days regardless of use (confirmed — see
   * docs/decisions/ADR-001-oauth-testing-mode-refresh-token.md). Caller is
   * responsible for persisting this via TokenStore, not this provider.
   */
  readonly refreshToken: string;
}

export interface OAuthSessionProvider {
  /**
   * Launches the interactive authorization flow (Custom Tabs / system
   * browser via AppAuth), prompting the user to grant access to their
   * Google account. Resolves once the user completes or cancels consent.
   *
   * @throws if the user denies consent, or the flow fails to complete
   *   (network error, redirect mismatch, etc). Callers should present this
   *   as "login was not completed", not a generic error (docs/SPEC.md
   *   section 11, empty/error states: "OAuth negado").
   */
  authorize(): Promise<OAuthSession>;

  /**
   * Exchanges a stored refresh token for a new access token (and,
   * depending on Google's rotation behavior, possibly a new refresh
   * token — callers must persist whatever is returned here, not assume
   * the original refresh token is still valid).
   *
   * @throws with a distinguishable "invalid_grant"-shaped error when the
   *   refresh token itself is no longer valid (revoked, expired after 7
   *   days in Testing mode, or exceeded the 50-tokens-per-client-user
   *   limit). Callers must treat this as "session expired, please sign in
   *   again", not retry it.
   */
  refresh(refreshToken: string): Promise<OAuthSession>;

  /**
   * Revokes the refresh token at Google's revocation endpoint and clears
   * any session state this provider itself holds (not the TokenStore —
   * that's the caller's responsibility, per docs/SPEC.md section 10,
   * "Desconectar").
   */
  revoke(refreshToken: string): Promise<void>;
}
