# Prompt de construção: Local2Playlist (React Native)

Para colar em um agente de código · base: Especificacao_Local2Playlist.md v0.1 · 14 de outubro de 2026

## Como usar

Coloque a especificação no repositório como `docs/SPEC.md`, cole no agente tudo a partir da seção 1 e peça uma fase por vez (seção 13). Os fatos da seção 3 foram conferidos em 14/10/2026; o agente deve reconferir os marcados VERIFICAR antes de depender deles. Os pontos marcados como proposta (seção 4) são sugestões desta análise, não decisões da especificação: aprove ou vete antes de colar.

## 1. Papel e modo de trabalho

Você é um engenheiro sênior de React Native e Android. Vai construir do zero o aplicativo Local2Playlist, descrito em `docs/SPEC.md`. Leia a especificação inteira antes de escrever qualquer código.

- Trabalhe por fases (seção 13) e pare no fim de cada uma com um resumo para revisão.
- Antes da fase 0, escreva um plano de no máximo uma página.
- Não invente APIs, parâmetros nem nomes de biblioteca. Para cada dependência nova, confira README, data da última publicação, issues abertas, compatibilidade com a versão do React Native e com a New Architecture, e fixe a versão exata.
- Toda decisão em aberto vira um spike curto e um registro em `docs/decisions/ADR-NNN.md` (contexto, opções, escolha, consequências).
- Escreva testes junto com o código. Não declare nada pronto sem ter rodado typecheck, lint e testes; mostre os comandos e um resumo da saída.
- Diga claramente o que não conseguiu verificar (comportamento em aparelho real, valor efetivo de cota, aprovação de OAuth).
- Se faltar informação essencial, faça no máximo três perguntas objetivas. Nos demais casos, assuma o padrão proposto e registre a suposição.

## 2. Produto e escopo

Em uma frase: o usuário escolhe uma pasta de músicas no Android; o app lê os metadados localmente, procura candidatos no YouTube pela API oficial, deixa o usuário revisar e cria uma playlist na conta dele.

**Dentro do MVP:** requisitos FR-01 a FR-14 da especificação (todos P0) e o modo exportação descrito na seção 4.

**Fora do MVP:** upload de áudio, download de áudio ou vídeo do YouTube, scraping ou APIs não oficiais, player de música, iOS, backend, importações ilimitadas, contornar anúncios, assinaturas ou restrições regionais.

## 3. Fatos verificados em 14/10/2026

- **Cota** (fonte: página oficial "Quota Calculator", atualizada em 08/10/2026). Um projeto com a API habilitada tem, por padrão, 100 chamadas por dia de `search.list` (balde próprio; cada chamada gasta 1 desse balde) e 10.000 unidades por dia combinadas para os demais métodos. `playlists.insert` e `playlistItems.insert` custam 50 unidades; os métodos `list` custam 1. Cada página extra de resultados cobra de novo, e requisição inválida custa pelo menos 1. O reset ocorre à meia-noite do horário do Pacífico. A cota pertence ao projeto, não ao usuário.
- **Consequência.** Com uma única credencial do app, são cerca de 100 faixas pesquisadas por dia somando todos os usuários, e cerca de 199 inserções por dia depois de criar uma playlist ((10.000 − 50) ÷ 50). Esse é o gargalo do produto.
- **Fontes divergentes.** Muitos blogs e repositórios antigos (por exemplo o Waltz, que calcula cerca de 66 faixas por dia) tratam `search.list` como 100 unidades dentro dos 10.000. Isso conflita com a página oficial atual. Use a página oficial e o Console do projeto como fonte de verdade e confirme o valor efetivo antes de desenhar a UX de cota (VERIFICAR).
- **Saldo não é consultável.** A API do YouTube não informa o saldo restante. O app só pode estimar localmente e reagir ao erro de cota excedida.
- **Concorrência.** TuneMyMusic e Soundiiz importam M3U, CSV e TXT e criam playlists no YouTube e no YouTube Music, mas partem de um arquivo, não de uma pasta do celular. Repositórios open source (Waltz, Quickify, Syncify, Spot2YTMusic, YouTubePlaylist) mostram padrões úteis: tela de revisão antes de gravar, cache de buscas, retomada no dia seguinte quando a cota acaba, relatório de falhas em arquivo. Não há evidência de que o diferencial "pasta direto do celular" seja valorizado; o modo exportação existe para testar isso de forma barata.
- **OAuth.** Um app com tela de consentimento externa em status "Testing" recebe refresh token que expira em 7 dias e tem limite de 100 usuários de teste. Os escopos de escrita do YouTube são sensíveis e exigem verificação para distribuição pública (VERIFICAR no Console). App instalado não guarda `client_secret`.
- **Metadados.** `MediaMetadataRetriever.setDataSource(context, uri)` aceita content URI, então é possível ler tags de arquivos obtidos por SAF sem copiá-los.

## 4. Decisões já tomadas e propostas

**Decisões da especificação (não reabrir sem ADR):**

- Android primeiro; React Native com TypeScript em modo estrito; interface em PT-BR com strings externalizadas (i18n).
- YouTube Data API v3 oficial. Sem scraping, sem ytmusicapi/Innertube, sem Invidious ou Piped.
- Sem backend e sem telemetria por padrão. O áudio nunca sai do aparelho.
- SAF para escolher a pasta; MediaStore só depois do MVP e atrás da mesma interface.
- Revisão manual no MVP; candidato abaixo do limiar nunca entra sozinho.
- Menor escopo OAuth aceito pelos endpoints; tokens no Keystore.

**Proposta desta análise (aprovar ou vetar):** promover a exportação de um CSV, M3U ou TXT limpo (a "Arquitetura D" da especificação) para P0. Ela não consome cota, não exige OAuth e valida extração de metadados, normalização e UX antes de investir na integração com o YouTube. O usuário poderia levar o arquivo ao TuneMyMusic ou ao Soundiiz como plano B.

> **Status: APROVADA** pelo usuário em 14/10/2026. Fase 1 inclui pipeline local + exportação, sem OAuth.

## 5. Possibilidades a avaliar

Para cada item: opções, padrão e como validar. Registre a escolha em ADR.

### 5.1 Expo ou React Native puro

- **Opções:** (a) Expo com development build e prebuild (config plugins, EAS Build); (b) React Native CLI puro.
- **Padrão:** (a). Módulos nativos exigem development build de qualquer forma, e o prebuild reduz configuração manual. Cair para (b) só se uma biblioteca nativa necessária não funcionar com config plugin.
- **Validar:** um spike que abre o seletor de pasta, lê uma tag e conclui o OAuth em aparelho real.

> **Status: CONFIRMADO** pelo usuário em 14/10/2026. O `.apk` final é gerado a partir do `android/` nativo produzido pelo `expo prebuild` (via `gradlew assembleRelease` ou EAS Build local/cloud), não do app Expo Go — compatível com geração de APK para o Android Developer / Play Console.

### 5.2 Acesso aos arquivos

- **Opções:** (a) biblioteca JS de SAF (por exemplo `react-native-saf-x`, com `openDocumentTree` e listagem, ou o seletor de diretório de `@react-native-documents/picker`); (b) módulo nativo próprio em Kotlin (TurboModule) usando `DocumentsContract` com uma consulta por diretório e projeção mínima; (c) MediaStore com `READ_MEDIA_AUDIO` (varredura ampla, mais permissão).
- **Padrão:** (a) no spike; (b) se a listagem recursiva de 5.000 ou mais arquivos demorar muito ou travar a UI, já que a listagem por `DocumentFile` faz uma consulta por arquivo. Sempre atrás de `AudioLibraryProvider`.
- Persistir a permissão da árvore escolhida e tratar revogação (URI que deixa de ser acessível).
- **Validar:** tempo e memória para listar 1.000 e 10.000 arquivos; cartão SD; pasta de provedor que não é armazenamento local.

### 5.3 Leitura de metadados

- **Opções:** (a) wrapper React Native de MetadataRetriever/MediaMetadataRetriever (por exemplo `@missingcore/react-native-metadata-retriever`; confirmar se aceita `content://`, pois o exemplo do README usa `file://`); (b) módulo Kotlin próprio com `MediaMetadataRetriever.setDataSource(context, uri)`; (c) parser em JS (`music-metadata`, `jsmediatags`), que exige trazer bytes pela ponte e polyfills.
- **Padrão:** (a) se aceitar content URI; senão (b). Evitar (c). Nunca ler o arquivo inteiro para o JS.
- Processar em lotes de 8 a 16 arquivos com concorrência limitada, gravando no SQLite a cada lote.
- **Validar:** MP3, M4A/AAC, FLAC, OGG, OPUS, WAV, arquivos sem tag e tags com codificação quebrada.

### 5.4 Persistência local

- **Opções:** `expo-sqlite`, `op-sqlite`, `react-native-nitro-sqlite`; MMKV só para flags simples.
- **Padrão:** SQLite com SQL explícito, migrações versionadas e repositórios tipados, sem ORM no MVP. Modo WAL e uma transação em cada transição da fila.

### 5.5 OAuth

- **Opções:** (a) `react-native-app-auth` (AppAuth: Custom Tabs, PKCE, refresh e revoke; para Google o esquema de redirect deriva do client ID Android); (b) `expo-auth-session`; (c) `@react-native-google-signin/google-signin` com escopos extras.
- **Padrão:** (a).
- **Validar:** consentimento concedido, negado, token expirado, token revogado, rotação do refresh token e comportamento em modo Testing.

### 5.6 Armazenamento de tokens

- **Opções:** `react-native-keychain` ou `expo-secure-store` (ambos apoiados no Keystore).
- Guardar só o refresh token e a validade; não guardar `id_token`; manter o access token apenas em memória. Nunca usar AsyncStorage nem MMKV sem criptografia para isso.
- Excluir do backup do Android (`allowBackup=false` e regras de extração de dados).

### 5.7 Execução em segundo plano

- **Opções:** (a) apenas em primeiro plano, com tela acesa e fila persistente; (b) serviço em primeiro plano (`react-native-background-actions` ou módulo nativo); (c) WorkManager por módulo nativo; (d) tarefas periódicas do Expo, que não servem para jobs longos.
- **Padrão:** (a). Com cerca de 100 buscas por dia o job é curto. Acrescentar uma notificação local avisando que a cota foi reiniciada e a importação pode ser retomada. Só migrar para (b) ou (c) se as medições mostrarem necessidade.

### 5.8 Matching e enriquecimento

- **Opções:** (a) heurística local pura em TypeScript; (b) normalização por MusicBrainz antes de pesquisar no YouTube (gratuito, sem chave, cerca de 1 requisição por segundo e User-Agent identificado), que melhora nomes canônicos sem gastar cota do YouTube mas envia metadados a um terceiro; (c) fingerprint acústico (Chromaprint/AcoustID) para arquivos sem tag, que exige ler áudio e módulo nativo; (d) LLM para interpretar nomes de arquivo.
- **Padrão:** (a). Deixar (b) atrás de uma feature flag desligada e opt-in documentado. (c) fica para fase futura. (d) fica fora do MVP por privacidade e custo.

### 5.9 Interface e estado

- **Opções:** React Navigation ou Expo Router; Zustand para estado de UI; FlashList para listas longas; `react-i18next`.
- **Padrão:** o mais simples que atenda aos critérios de acessibilidade e desempenho da seção 11. Sem biblioteca de UI pesada.

### 5.10 Estratégia de cota (afeta o produto, não só o código)

- **A) Credencial do app:** 100 buscas por dia para o projeto inteiro. Serve para protótipo e teste fechado.
- **B) Modo exportação** (CSV, M3U ou TXT para TuneMyMusic ou Soundiiz): zero cota.
- **C) Credencial própria do usuário** (cada pessoa cria o próprio projeto no Google Cloud): cota separada por pessoa, mas alta fricção. Avaliar contra as políticas do YouTube antes de implementar (VERIFICAR). Nunca rotacionar chaves ou projetos do desenvolvedor para escapar do limite.
- **D) Extensão de cota aprovada** (formulário e auditoria de conformidade): caminho para publicação ampla, sem garantia de prazo ou aprovação.
- **E) Importação em várias sessões,** com lotes diários e retomada.
- **Padrão:** implementar A, B e E; deixar a camada preparada (credencial injetável) para C e D.

## 6. Arquitetura-alvo

Fluxo de dependência: UI → casos de uso → portas (interfaces) → adaptadores (React Native, nativo, rede, SQLite). A camada `domain` é TypeScript puro, sem importar `react-native`, e roda em testes Node.

```
src/
  app/                 # navegação, providers, telas
  features/            # library, matching, import, auth, playlist, settings
  domain/
    models/            # Track, Candidate, ImportJob, JobItem
    usecases/
    ports/             # interfaces abaixo
  adapters/
    files/             # SafAudioLibraryProvider (MediaStore depois)
    metadata/          # leitor de tags nativo
    youtube/           # YouTubeClient, erros, schemas
    oauth/             # sessão OAuth
    storage/           # SQLite, repositórios, SecureTokenStore
    quota/             # QuotaGovernor
  i18n/pt-BR.json
native/android/        # módulos Kotlin, se necessários
eval/                  # dataset rotulado e script de métricas
docs/                  # SPEC, decisions, QUOTA, PRIVACY, OAUTH_SETUP
```

Portas: `AudioLibraryProvider`, `TrackMetadataExtractor`, `DuplicateDetector`, `YouTubeSearchProvider`, `MatchScorer`, `OAuthSessionProvider`, `PlaylistWriter`, `ImportQueue`, `QuotaGovernor`, `TokenStore`, `Clock`.

## 7. Dados e máquina de estados

Tabelas mínimas: `tracks`, `candidates`, `import_jobs`, `job_items`, `quota_ledger`, `settings`. Caminhos de arquivo e nomes ficam só no SQLite local.

Estados da faixa: `pending` → `matched` ou `skipped` ou `failed`. Estados do item na fila: `queued` → `inserting` → `added` ou `failed`. O estado `inserting` é acrescentado à especificação para tornar explícito o caso de resultado incerto.

**Protocolo de escrita idempotente:**

1. Gravar `inserting` (com id da tentativa) em transação antes de enviar a requisição.
2. Se a resposta for sucesso, gravar `added` com o id do item da playlist.
3. Em timeout, queda de rede ou morte do processo, o item permanece `inserting`. Ao retomar, consultar `playlistItems.list` filtrando por playlist e vídeo (1 unidade) antes de qualquer nova tentativa; se existir, marcar `added`; se não, tentar uma vez.
4. Erro 4xx definitivo vira `failed` com motivo mapeado. Erro de cota pausa a fila inteira e não marca os itens como falha.
5. A criação da playlist segue o mesmo princípio: gravar a intenção, e ao retomar verificar se uma playlist com aquele título foi criada há pouco antes de criar outra.

Dados vindos da API do YouTube: guardar o mínimo (`videoId`, título, canal, duração) com `retrieved_at` e uma rotina de limpeza ou atualização conforme as Developer Policies (a especificação cita janelas de 30 dias; VERIFICAR a regra por campo).

## 8. Algoritmos

- **Normalização.** Unicode NFKC; remover diacríticos apenas na chave de comparação (preservar o texto de exibição); colapsar espaços; tratar "feat.", "ft.", "with"; tratar parênteses e colchetes; remover prefixo de faixa como "03 - " somente com alta confiança; separar artista - título por " - ", " – " ou "-"; nome sem padrão reconhecível vira `needs_manual`.
- **Versão.** Extrair `versionHint` (live, remix, remaster, acoustic, karaoke, radio edit, instrumental, sped up, slowed, cover) e mantê-lo na consulta. Nunca apagar qualificadores silenciosamente.
- **Deduplicação em três níveis** (especificação, seção 8.4): URI estável; artista + título + versão normalizados; similaridade textual sempre enviada para revisão. Nunca fundir original, ao vivo e remix.
- **Consulta.** Principal: artista + título (+ versão, se houver). No máximo uma consulta alternativa por faixa, e só se o usuário permitir, porque cada consulta gasta 1 busca do balde diário. Parâmetros a testar no dataset: `type=video`, `maxResults=5`, com e sem `videoCategoryId=10`.
- **Durações.** Chamar `videos.list` em lote de até 50 IDs reunindo candidatos de várias faixas (1 unidade por chamada).
- **Pontuação** (heurística, não calibrada): título 35%, artista 35%, duração 20%, versão e fonte 10%; limiares iniciais 0,88 e 0,65 configuráveis; devolver `scoreReasons`. Similaridade por token-set e Jaro-Winkler ou Levenshtein normalizado, em funções puras. Sinais negativos quando o arquivo não indica: cover, karaoke, reaction, lyrics. Sinal positivo a validar: canal oficial ou "- Topic".
- **Avaliação.** Dataset rotulado à mão em `eval/golden.json` (casos da especificação, seção 18.3) com respostas sintéticas escritas à mão, e um script que calcula Precision@1, porcentagem sem correspondência, falsos positivos acima do limiar e porcentagem que exige revisão. Não commitar respostas reais da API.

## 9. Integração com o YouTube e governador de cota

- `YouTubeClient` tipado, com validação de resposta por schema (por exemplo zod) e mapeamento de erros. Conferir as tabelas oficiais de erro de cada método; mapear no mínimo: cota excedida, limite de taxa, autenticação inválida, permissão insuficiente, vídeo ou playlist não encontrado e erro transitório 5xx.
- `QuotaGovernor`: contadores locais por dia no fuso America/Los_Angeles (estimativa; o app não enxerga o uso de outros aparelhos). Antes de um lote, calcular e mostrar buscas necessárias, buscas disponíveis (estimadas) e inserções (50 unidades cada); oferecer lote parcial. Ao receber erro de cota, pausar a fila inteira, não marcar falha e mostrar que a importação pode ser retomada após o reinício diário, sem prometer horário exato. Validar `Intl` com fuso no Hermes ou usar biblioteca de datas.
- Retentativas apenas para leituras e erros 5xx transitórios, com backoff exponencial, jitter e teto. Escritas seguem o protocolo da seção 7.
- Playlist criada como privada por padrão; a visibilidade é escolhida e confirmada antes de criar. Link final: `https://www.youtube.com/playlist?list=<ID>`.
- Sem API key no APK: usar o token OAuth também em `search.list` (confirmar os escopos aceitos pelo método; VERIFICAR). Se for inevitável usar chave, restringir por pacote, SHA-1 e API.

## 10. Segurança e privacidade

- Logs com allowlist e redação. Nunca registrar tokens, authorization code, caminhos completos nem nomes de faixas. Build de release sem logs verbosos.
- Manifest com apenas as permissões necessárias (SAF não exige permissão de mídia; INTERNET sim), `allowBackup=false` ou regras de extração, tráfego em texto claro desabilitado e R8 ativado.
- Dependências com versões fixas, `npm audit`, revisão das permissões de SDKs, Renovate ou Dependabot, e gitleaks no pré-commit e no CI.
- Teste de tráfego com proxy (por exemplo mitmproxy) comprovando que saem apenas consultas de busca e IDs, nenhum áudio.
- Tela de privacidade e rascunho de política: dados tratados, escopos, retenção, desconexão e como revogar o acesso na conta Google. Verificar nas Developer Policies do YouTube os avisos exigidos ao usuário (Termos do YouTube e Política de Privacidade do Google) (VERIFICAR).
- O nome do app não deve sugerir afiliação ao YouTube ou ao Google; seguir as diretrizes de marca do YouTube.
- Desconectar: revogar o token no endpoint de revogação do Google, apagar tokens locais e oferecer limpar o histórico.

## 11. UX e acessibilidade

- Telas: as nove da especificação, seção 17.
- Confirmação antes de qualquer escrita, com resumo: número de faixas, nome e visibilidade da playlist, correspondências duvidosas e estimativa de cota.
- Lista de correspondências: faixa local → candidato (título, canal, duração, confiança) com ações aceitar, trocar, ignorar, buscar de novo e "nenhum destes". Baixa confiança nunca escondida; ordenar "revisar primeiro".
- Nunca mostrar "100% concluído" enquanto houver falhas sem explicação. Relatório final com exportação das não encontradas em CSV.
- Acessibilidade: rótulos para TalkBack, alvos de toque de pelo menos 48 dp, erro nunca indicado só por cor, texto escalável, contraste AA e modo escuro.
- Estados vazios e de erro para: pasta vazia, pasta inacessível, sem internet, OAuth negado, cota esgotada e token revogado.
- Desempenho: listas virtualizadas, rolagem fluida com 5.000 itens e trabalho pesado fora da thread de UI.

## 12. Qualidade

- Testes unitários de tudo o que a especificação lista em 18.1, no domínio em Node puro.
- Testes de integração com rede simulada (por exemplo `msw`): OAuth, cota esgotada, timeout de escrita e retomada.
- E2E com Maestro (ou Detox) no fluxo pasta → revisão → playlist de teste, com a rede simulada.
- Aparelhos reais: pelo menos um Android 11 ou superior, um Android 13 ou superior e, se possível, um com cartão SD.
- CI (GitHub Actions): typecheck, lint, testes, `expo-doctor` (se Expo), build de debug, gitleaks e audit.
- Meta de cobertura do domínio em torno de 80%.
- Definição de pronto: a lista da seção 22 da especificação.

## 13. Fases e critérios de aceite

- **Fase 0: spikes.** Uma tela de teste, sem design. Entregar: ADRs das decisões da seção 5; medições (tempo de listagem, formatos de tag lidos, consumo de cota ao criar uma playlist com 20 a 50 faixas, como a playlist aparece no YouTube e no YouTube Music). Aceite: relatório com os números e decisão sobre Expo ou RN puro, biblioteca de SAF, leitor de tags e OAuth.
- **Fase 1: pipeline local e exportação.** Seleção de pasta, listagem, metadados, normalização, deduplicação, revisão local e exportação em CSV, M3U e TXT, sem OAuth. Aceite: critérios 1 a 4 da seção 22 da especificação e um arquivo exportado importado com sucesso no TuneMyMusic ou no Soundiiz.
- **Fase 2: integração com o YouTube.** OAuth, busca, pontuação, revisão, criação de playlist, fila persistente com retomada, governador de cota e relatório. Aceite: os demais itens da seção 22, em conta de teste com até 50 faixas.
- **Fase 3: endurecimento.** Acessibilidade, segurança, teste de tráfego, privacidade, E2E, aparelhos reais e documentação de OAuth e privacidade pronta para uma verificação.
- **Fase 4 (só se eu pedir).** Importar M3U, modo automático com limiar configurável, credencial própria do usuário, MediaStore e iOS.

## 14. Entregáveis e formato das respostas

- Repositório com README (como rodar e como configurar projeto no Google Cloud e client OAuth Android), `docs/decisions`, `docs/QUOTA.md` (modelo de cota e medições), `docs/PRIVACY.md`, `docs/OAUTH_SETUP.md`, `eval/` e scripts.
- Ao fim de cada fase, responder com: (1) o que foi feito; (2) como rodar e testar; (3) o que foi verificado e como; (4) o que não foi verificado; (5) riscos e decisões que dependem de mim.
- TypeScript estrito, sem `any` sem justificativa, funções pequenas, identificadores em inglês, textos de interface em PT-BR via i18n e commits convencionais.

## 15. Proibições

- Não usar scraping, endpoints privados ou bibliotecas não oficiais do YouTube Music.
- Não baixar áudio ou vídeo do YouTube e não enviar áudio do usuário para lugar nenhum.
- Não registrar tokens, nomes de faixas ou caminhos em logs ou telemetria.
- Não usar AsyncStorage para tokens e não embutir `client_secret`.
- Não repetir uma escrita após timeout sem verificar se ela já foi concluída.
- Não rotacionar chaves ou projetos para escapar da cota.
- Não remover "live", "remix" ou semelhantes em silêncio e não importar candidato de baixa confiança sem confirmação.
- Não commitar respostas reais da API do YouTube.
- Não afirmar que o app é o primeiro ou o único, nem que a conversão é perfeita.

---

## Decisões confirmadas com o usuário (14/10/2026)

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Repositório de trabalho | `laranjodupy/local2repository` (GitHub, público) |
| 2 | Promover modo exportação (CSV/M3U/TXT) a P0 | **Aprovado** |
| 3 | Expo (dev build + prebuild) vs RN CLI puro | **Expo confirmado** — gera `.apk` nativo via prebuild, compatível com distribuição no Android Developer / Play Console. Não depende do Expo Go. |
| 4 | Push para o GitHub nesta sessão | Bloqueado (GitHub App do Claude não autorizado para o repo/organização). Trabalho segue local até o usuário autorizar. |
