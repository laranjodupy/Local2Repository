# Configuração do OAuth e do projeto no Google Cloud

Guia para criar o projeto, habilitar a YouTube Data API v3 e gerar o OAuth Client ID Android usado pelo Local2Playlist. Necessário antes dos spikes de OAuth e cota da Fase 0.

> Fonte primária: [Android Quickstart — YouTube Data API](https://developers.google.com/youtube/v3/quickstart/android) (conferido em 14/10/2026). Os pontos sobre modo "Testing" vs "Production" da tela de consentimento (refresh token de 7 dias, limite de 100 usuários — seção 3 de `docs/SPEC.md`) vêm de outra parte do Console e devem ser reconfirmados na tela "OAuth consent screen" > "Publishing status" ao configurar — **VERIFICAR**.

## 1. Criar o projeto e habilitar a API

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/).
2. Crie um novo projeto (ex: `local2playlist-dev`).
3. No menu "APIs e serviços" → "Biblioteca", busque **YouTube Data API v3** e clique em **Ativar**.

## 2. Configurar a tela de consentimento OAuth

1. Em "APIs e serviços" → "Tela de permissão OAuth" ("OAuth consent screen").
2. Tipo: **Externo** (External) — único disponível sem Google Workspace.
3. Preencha nome do app, e-mail de suporte, e-mail de contato do desenvolvedor.
4. **Escopos:** adicione o menor escopo necessário (seção 5.5 da spec — "menor escopo OAuth aceito pelos endpoints"). Para `playlists.insert` e `playlistItems.insert` isso provavelmente é `https://www.googleapis.com/auth/youtube` (escrita) — não `youtube.readonly`. **A confirmar no spike**: qual é o escopo mínimo que `search.list` + `playlists.insert` + `playlistItems.insert` aceitam juntos.
5. **Usuários de teste:** enquanto o app estiver em status "Testing" (padrão para apps não verificados), adicione aqui o e-mail da conta Google que vai testar (a sua, `daniel.v.lima7@aluno.senai.br` ou outra conta pessoal — até 100 usuários de teste).
6. **Importante (VERIFICAR ao configurar):** confirme nesta tela o status de publicação atual ("Testing") e, se visível, a validade do refresh token nesse status. A spec assume 7 dias com base em comportamento documentado do Google para apps não verificados; confirme se isso ainda é exibido/aplicado no momento em que você configurar.

## 3. Obter o SHA-1 do certificado de assinatura (debug)

No seu ambiente local (não nesta sessão — este workspace não tem o keystore de debug do seu Android Studio):

```bash
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -list -v
```

Senha padrão do keystore de debug: `android`. Copie o valor `SHA1:` da saída.

> Isso precisa ser rodado na sua máquina (ou no seu emulador/Android Studio), já que o keystore de debug é gerado localmente na primeira vez que você builda um projeto Android ali. Se você ainda não tem um `debug.keystore`, o Android Studio cria um automaticamente no primeiro build — ou rode `keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000`.

## 4. Criar o OAuth Client ID (tipo Android)

1. Em "APIs e serviços" → "Credenciais" → "Criar credenciais" → "ID do cliente OAuth".
2. Tipo de aplicativo: **Android**.
3. Nome do pacote: o `applicationId` que vamos definir no `app.json`/`android/app/build.gradle` do projeto Expo — provavelmente algo como `com.laranjodupy.local2playlist` (a confirmar quando o projeto Expo for criado na Fase 0).
4. Cole o SHA-1 obtido no passo 3.
5. Clique em **Criar**.

**Resultado:** você recebe um **Client ID** (termina em `.apps.googleusercontent.com`). Apps Android instalados **não recebem nem devem armazenar** `client_secret` (seção 5.5/15 da spec) — só o Client ID é necessário no app.

## 5. O que me passar

Depois de concluir os passos acima, me passe:

- O **Client ID Android** (`...apps.googleusercontent.com`) — isso não é segredo, pode ser incluído no app.
- O **nome do pacote** (`applicationId`) que você cadastrou, para eu manter consistente no projeto Expo.
- Confirmação de que a YouTube Data API v3 está **ativada** no projeto.
- Confirmação de quais **escopos** você adicionou na tela de consentimento.

**Nunca me passe:** `client_secret` (apps Android não deveriam ter um, mas se o Console gerar algum arquivo `.json` com um, não cole aqui), nem tokens de acesso/refresh de contas reais.

## 6. Limitações conhecidas (a validar no spike)

- Modo "Testing": até 100 usuários de teste, refresh token pode expirar em 7 dias (VERIFICAR nesta configuração).
- Cota do projeto: 100 unidades/dia em `search.list` (balde próprio) + 10.000 unidades/dia combinadas para os demais métodos (seção 3 da spec, fonte: Quota Calculator oficial, atualizada 08/10/2026). Vamos medir o consumo real ao criar uma playlist de teste na Fase 0 e registrar em `docs/QUOTA.md`.
