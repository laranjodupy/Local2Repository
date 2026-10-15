# ADR-002: Biblioteca de OAuth — react-native-app-auth

Status: Decidido em 14/10/2026 · Relacionado: `docs/SPEC.md` seção 5.5, `docs/OAUTH_SETUP.md`

## Contexto

A spec (seção 5.5) já propunha `react-native-app-auth` (AppAuth: Custom Tabs,
PKCE, refresh e revoke) como padrão, com `expo-auth-session` e
`@react-native-google-signin/google-signin` como alternativas. Antes de
instalar, era preciso confirmar: versão atual, compatibilidade com
RN 0.86.3 / New Architecture, e se existe caminho oficial para Expo
development build (não Expo Go) sem configuração nativa manual demais.

## Investigação (14/10/2026)

- **Versão e manutenção:** `8.5.0`, publicada em 30/09/2026 via registry do
  npm (`https://registry.npmjs.org/react-native-app-auth`) — duas semanas
  antes desta decisão, portanto ativamente mantida.
- **peerDependencies:** `"react-native": ">=0.63.0"` — compatível com
  `0.86.3` (já no `package.json`).
- **New Architecture:** não encontrei confirmação explícita na documentação
  oficial (nearform.com/open-source/react-native-app-auth) nem no README do
  GitHub. **Não verificado** — só será confirmado rodando o spike em
  dispositivo real.
- **Expo:** existe um **Expo config plugin oficial**, mas só a partir do
  **Expo SDK 53+**, via fluxo CNG (Continuous Native Generation —
  `expo prebuild`). Não funciona no Expo Go, o que já é consistente com a
  decisão da seção 5.1 (development build, nunca Expo Go). Nosso
  `package.json` já está em Expo `~57.0.29`, bem acima do mínimo.
- Fonte: [nearform.com/open-source/react-native-app-auth/docs/usage/expo-setup](https://nearform.com/open-source/react-native-app-auth/docs/usage/expo-setup)
  e [.../docs/providers/google](https://nearform.com/open-source/react-native-app-auth/docs/providers/google)
  (documentação oficial mantida pela Nearform/Formidable, não um blog
  terceiro).

## Decisão

Usar `react-native-app-auth@8.5.0` (versão exata fixada), configurado via:

1. **Plugin Expo** em `app.json`:
   ```json
   {
     "plugins": [
       ["react-native-app-auth", { "redirectUrls": ["com.googleusercontent.apps.542799348342-n53tu24i98chlh8oqhalfqqgm84uc4c9:/oauth2redirect/google"] }]
     ]
   }
   ```
   Note que o scheme do redirect **não** é o `applicationId`
   (`com.laranjodupy.local2playlist`) — é
   `com.googleusercontent.apps.<GUID>`, onde `<GUID>` é a parte numérica do
   Client ID antes de `.apps.googleusercontent.com`. Isso é uma convenção do
   Google, não da lib.

2. **Config de `authorize()`** (a implementar no adapter):
   ```ts
   {
     issuer: 'https://accounts.google.com',
     clientId: '542799348342-n53tu24i98chlh8oqhalfqqgm84uc4c9.apps.googleusercontent.com',
     redirectUrl: 'com.googleusercontent.apps.542799348342-n53tu24i98chlh8oqhalfqqgm84uc4c9:/oauth2redirect/google',
     scopes: ['https://www.googleapis.com/auth/youtube'],
   }
   ```
   O exemplo oficial da lib usa `scopes: ['openid', 'profile']` (login
   simples) — trocamos pelo escopo de gerenciamento do YouTube porque é
   isso que o app precisa (não autenticação de usuário, mas autorização de
   escrita na conta do YouTube).

3. Após editar `app.json`, rodar `npx expo prebuild --clean` para gerar
   `android/` com o `manifestPlaceholders.appAuthRedirectScheme` correto.

## Consequências

- Alternativas descartadas por ora: `expo-auth-session` (não investigada a
  fundo — `react-native-app-auth` já tinha suporte Expo oficial suficiente
  para não precisar comparar) e `@react-native-google-signin/google-signin`
  (mais focada em "Sign in with Google"/identidade do que em escopos de
  API de terceiros como o YouTube; não reavaliada aqui).
- **Não verificado nesta sessão:** compatibilidade real com a New
  Architecture do React Native, e se o fluxo de `authorize()` completa de
  fato em dispositivo Android (Custom Tabs abrindo, token sendo trocado).
  Isso só é testável no spike em dispositivo/emulador real — não há como
  validar isso neste ambiente de nuvem sem Android.
- Mudanças no Console do Google (como o redirect scheme) podem levar "5
  minutos a algumas horas" para propagar, segundo a documentação da lib —
  relevante para não entrar em pânico se o primeiro teste falhar
  imediatamente após configurar.
