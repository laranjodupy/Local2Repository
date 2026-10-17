/**
 * Dynamic Expo config (replaces the former static app.json).
 *
 * Why dynamic: the app has two OAuth Client IDs registered in Google
 * Cloud Console — one per signing key (debug vs release keystore, see
 * docs/decisions/ADR-004-release-oauth-client.md and
 * src/config/googleOAuth.ts). Which one is correct depends on which
 * `gradlew assemble*` variant you're about to build, and that has to be
 * known BOTH:
 *   - natively, so react-native-app-auth's config plugin writes the
 *     matching `appAuthRedirectScheme` into android/app/build.gradle
 *     (the plugin only supports one redirect scheme per prebuild — see
 *     node_modules/react-native-app-auth/plugin/build/android/app-build-gradle.js,
 *     which throws if manifestPlaceholders is already present, so this
 *     can't be "registered twice"), and
 *   - in JS, so src/config/googleOAuth.ts picks the matching Client ID
 *     (via Constants.expoConfig.extra.appVariant below).
 *
 * A static app.json can't read an environment variable, so this had to
 * become app.config.js. Controlled by the APP_VARIANT env var:
 *
 *   Debug (default, no env var needed):
 *     npx expo prebuild --clean
 *     cd android && gradlew assembleDebug
 *
 *   Release:
 *     APP_VARIANT=release npx expo prebuild --clean
 *     cd android && gradlew assembleRelease
 *
 * IMPORTANT: prebuild must be re-run (with the right APP_VARIANT) any
 * time you switch which variant you're building — the generated
 * android/ folder bakes in whichever redirect scheme was active at
 * prebuild time. Building assembleRelease against an android/ folder
 * that was prebuilt for debug (or vice versa) will silently carry the
 * wrong OAuth redirect scheme and fail at the Custom Tab redirect step.
 */

const APP_VARIANT = process.env.APP_VARIANT === 'release' ? 'release' : 'debug';

const GOOGLE_OAUTH_REDIRECT_URLS = {
  debug: 'com.googleusercontent.apps.542799348342-n53tu24i98chlh8oqhalfqqgm84uc4c9:/oauth2redirect/google',
  release: 'com.googleusercontent.apps.542799348342-2t309iigu2ka09h1tvo5lv207p17ukgb:/oauth2redirect/google',
};

module.exports = {
  expo: {
    name: 'Local2Playlist',
    slug: 'local2playlist',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'local2playlist',
    experiments: {
      typedRoutes: true,
    },
    android: {
      package: 'com.laranjodupy.local2playlist',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      allowBackup: false,
    },
    extra: {
      // Read by src/config/googleOAuth.ts via expo-constants at runtime.
      appVariant: APP_VARIANT,
    },
    plugins: [
      'expo-router',
      [
        'react-native-app-auth',
        {
          redirectUrls: [GOOGLE_OAUTH_REDIRECT_URLS[APP_VARIANT]],
        },
      ],
      './plugins/withGradleJvmArgs.js',
    ],
  },
};
