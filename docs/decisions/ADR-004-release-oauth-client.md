# ADR-004: Client ID OAuth separado para build de release + seleção por `APP_VARIANT`

Status: Decidido em 17/10/2026 · Relacionado: ADR-002 (biblioteca OAuth),
ADR-003 (memória do Gradle Daemon), `docs/OAUTH_SETUP.md`

## Contexto

O `gradlew assembleDebug` apresentou erro na máquina de Daniel (detalhes
do erro não capturados nesta sessão — Daniel optou por seguir direto
para o build de release em vez de diagnosticar o debug). A decisão foi
voltar à variante `assembleRelease`, que já havia funcionado uma vez
(ver ADR-003), mas que exige uma chave de assinatura de release própria
— e o Client ID OAuth existente estava registrado apenas contra o SHA-1
da keystore de **debug**.

## Decisão

1. Gerar uma keystore de release própria
   (`%USERPROFILE%\.android\release.keystore`, alias
   `local2playlist-release`), com SHA-1:
   ```
   1A:7A:7D:A9:64:17:DF:C4:4D:34:C0:C5:AD:01:4E:1A:A7:37:23:AD
   ```
2. Registrar um **segundo** OAuth Client ID (tipo Android) no mesmo
   projeto do Google Cloud Console, para o mesmo pacote
   `com.laranjodupy.local2playlist`, mas contra esse SHA-1 de release:
   ```
   542799348342-2t309iigu2ka09h1tvo5lv207p17ukgb.apps.googleusercontent.com
   ```
   (O Client ID de debug permanece registrado e válido — Google permite
   múltiplos Client IDs Android para o mesmo pacote, um por certificado.)
3. Dividir `src/config/googleOAuth.ts` em três arquivos:
   `googleOAuth.debug.ts`, `googleOAuth.release.ts` (os dois objetos de
   config completos, cada um com seu Client ID e `redirectUrl`) e
   `googleOAuth.ts` (seleciona entre os dois lendo
   `Constants.expoConfig.extra.appVariant` via `expo-constants`).
4. Converter `app.json` → `app.config.js` (dinâmico), para poder ler
   `process.env.APP_VARIANT` em build-time e:
   - escrever `extra.appVariant` (consumido pelo JS em runtime);
   - escolher qual `redirectUrls` passar ao plugin do
     `react-native-app-auth`.

## Descoberta que moldou a solução

Antes de escrever o `app.config.js`, foi lido
`node_modules/react-native-app-auth/plugin/build/android/app-build-gradle.js`
(não assumido de memória) para confirmar como o plugin aplica o
`redirectUrl` no lado nativo Android. Dois fatos relevantes:

- O plugin grava o scheme como `manifestPlaceholders.appAuthRedirectScheme`
  **fixo** em `android/app/build.gradle`, dentro do bloco `defaultConfig`
  — não por `buildType` (`debug`/`release`), e **não suporta múltiplos
  schemes simultaneamente**: se `manifestPlaceholders` já existir no
  arquivo, o plugin lança `Error('app/build.gradle already contains
  manifestPlaceholders, cannot update automatically!')`.
- O scheme do redirect (`com.googleusercontent.apps.<GUID>`) inclui o
  próprio GUID do Client ID — então o scheme de debug e o de release são
  literalmente strings diferentes, não só o Client ID por trás deles.

Consequência prática: **não é possível gerar uma única pasta `android/`
que sirva para as duas variantes.** Cada troca de variante exige rodar
`npx expo prebuild --clean` de novo com o `APP_VARIANT` correto, para
que tanto o manifest nativo quanto o bundle JS fiquem consistentes com
a mesma variante.

## Consequências

- **Fluxo de build mudou**: antes bastava `gradlew assembleDebug`;
  agora cada troca de variante exige `APP_VARIANT=release npx expo
  prebuild --clean` (ou sem a env var, para debug) antes do `gradlew
  assemble*` correspondente. Isso está documentado nos comentários de
  `app.config.js` e `src/config/googleOAuth.ts`.
- Esquecer de rebuildar com o `APP_VARIANT` certo não quebra em tempo de
  compilação — o app compila normalmente, mas o login OAuth falhará no
  redirect (scheme nativo não bate com o Client ID que o JS está usando),
  o que pode ser confuso de diagnosticar sem este ADR.
- **NÃO VERIFICADO**: nenhuma das duas variantes foi testada em
  dispositivo ainda (nem o fluxo de login completo, nem a troca de
  variante via `APP_VARIANT`). Continua pendente o teste real na tela
  `/oauth-spike`.
- A keystore de release (`release.keystore`) e suas senhas não foram e
  não devem ser commitadas neste repositório — ficam apenas na máquina
  de Daniel. Perder esse arquivo depois de uma eventual publicação na
  Play Store tornaria o app não atualizável sob a mesma ficha.
