/**
 * Google OAuth config for the RELEASE build variant (gradlew
 * assembleRelease), signed with ~/.android/release.keystore
 * (docs/OAUTH_SETUP.md section 3).
 *
 * This Client ID is registered in Google Cloud Console against that
 * release keystore's SHA-1:
 *   1A:7A:7D:A9:64:17:DF:C4:4D:34:C0:C5:AD:01:4E:1A:A7:37:23:AD
 *
 * Do not use this config for an assembleDebug build — the redirect
 * will not round-trip because Google validates the SHA-1 of the APK
 * that opened the Custom Tab against the one registered for this
 * specific Client ID. See googleOAuth.ts for how the right file gets
 * picked, and googleOAuth.debug.ts for the debug counterpart.
 *
 * SECURITY: the release.keystore file itself (and its passwords) must
 * never be committed to this repository — losing it after a Play Store
 * publish would make the app un-updatable under the same listing. Keep
 * it outside the repo, per docs/OAUTH_SETUP.md.
 */

const GOOGLE_OAUTH_CLIENT_GUID_RELEASE =
  '542799348342-2t309iigu2ka09h1tvo5lv207p17ukgb';

export const googleOAuthConfigRelease = {
  issuer: 'https://accounts.google.com',
  clientId: `${GOOGLE_OAUTH_CLIENT_GUID_RELEASE}.apps.googleusercontent.com`,
  redirectUrl: `com.googleusercontent.apps.${GOOGLE_OAUTH_CLIENT_GUID_RELEASE}:/oauth2redirect/google`,
  // Same scope as debug — see googleOAuth.debug.ts for rationale.
  scopes: ['https://www.googleapis.com/auth/youtube'] as string[],
};
