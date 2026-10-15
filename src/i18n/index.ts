import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './pt-BR.json';

// Only pt-BR is shipped for the MVP (spec section 1: "interface em PT-BR com
// strings externalizadas"). The resource structure stays keyed by locale so
// additional languages can be added later without touching call sites.
const resources = {
  'pt-BR': { translation: ptBR },
} as const;

// i18n.use is the documented i18next API; this rule misreads the package's
// export shape and flags it as if `use` were a separate named export.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources,
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  interpolation: {
    escapeValue: false,
  },
  // React Native has no XSS-via-innerHTML risk, and disabling suspense keeps
  // the initial render synchronous since resources are bundled, not fetched.
  react: {
    useSuspense: false,
  },
});

export default i18n;
