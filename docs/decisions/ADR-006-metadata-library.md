# ADR-006: Biblioteca para leitura de metadados de áudio

Status: Decidido em 18/10/2026 · Relacionado: `docs/SPEC.md` seção 5.3,
Fase 0 (spikes)

## Contexto

A seção 5.3 do SPEC propõe como padrão a opção (a) "wrapper React Native
de MetadataRetriever/MediaMetadataRetriever (por exemplo
`@missingcore/react-native-metadata-retriever`; confirmar se aceita
`content://`, pois o exemplo do README usa `file://`)", caindo para (b)
módulo Kotlin próprio só se (a) não aceitar `content://`. A opção (c)
(parser em JS como `music-metadata`/`jsmediatags`) é explicitamente
desaconselhada pelo SPEC, porque exigiria trazer bytes do arquivo pela
ponte React Native e usar polyfills — e o SPEC pede nunca ler o arquivo
inteiro para o JS.

## Investigação

**Pacote e manutenção:**
- `@missingcore/react-native-metadata-retriever`, versão estável mais
  recente `3.2.1`, publicada em **21/06/2026**; existe também uma
  `4.0.0-beta.1` publicada em 04/07/2026 (não usada aqui — pré-release,
  risco maior para uma decisão de Fase 0).
- Confirmado via `npm view ... time` — biblioteca ativamente mantida,
  ao contrário do que se verificou para a opção de SAF do ADR-005.

**O ponto crítico do SPEC (aceita `content://`?):**
- O README (lido via unpkg) só mostra um exemplo com `file://` e não
  afirma explicitamente suporte a `content://` — exatamente o alerta
  que o SPEC já continha.
- Para não depender só da documentação (que está incompleta neste
  ponto), o código-fonte nativo Android foi lido diretamente (pacote
  instalado em diretório de escopo, não no projeto):
  `android/src/main/java/.../modules/MetadataRetrieverModule.kt` e
  `utils/Normalization.kt`.
- O caminho principal de leitura (`getFormatList`) constrói a origem
  assim:
  ```kotlin
  val mediaItem = MediaItem.fromUri(Normalization.getSafeUri(uri))
  MetadataRetriever.Builder(context, mediaItem).build()...
  ```
  Isso usa a API `androidx.media3.exoplayer.MetadataRetriever`
  (Media3/ExoPlayer), que resolve `MediaItem.fromUri` através do
  `ContentResolver` do Android — mecanismo que suporta `content://`
  nativamente, pela própria natureza da API (é o mesmo mecanismo usado
  para tocar mídia de qualquer proveniência, incluindo SAF).
- Há também um caminho de fallback (para tags ID3v1 que o Media3 não
  lê) usando `MediaMetadataRetriever.setDataSource(String)` — a variante
  que recebe só uma string de URI, não a variante com `Context`
  explícito que o SPEC menciona como fato verificado na seção 3
  ("`MediaMetadataRetriever.setDataSource(context, uri)` aceita content
  URI"). Essa variante por string também costuma aceitar `content://`
  no Android moderno, mas isso **não foi confirmado lendo o código-fonte
  do Android em si** (é parte do framework, não deste pacote) — fica
  como ponto a validar no spike em dispositivo, especificamente testando
  um arquivo com tags ID3v1 puras (caso raro, mas o fallback existe
  exatamente para cobri-lo).
- `Normalization.getSafeUri` só escapa `%`, `?`, `#` na string — não
  interfere no esquema (`content://` vs `file://`), então não há
  tratamento especial que quebre uma URI SAF.

**Campos retornados:** `title`, `artist`, `albumTitle`, `albumArtist`,
`genre`, `trackNumber`/`totalTrackCount`, `discNumber`/`totalDiscCount`,
datas, artwork (`artworkData`/`artworkUri`), entre outros. Não há campo
`duration` explícito na lista do README — a confirmar no spike se algum
campo de formato (`bitrate`+`sampleRate` ou similar) permite derivá-la,
ou se duration precisa vir de outra chamada.

**Formatos suportados:** o README não lista explicitamente MP3, M4A/AAC,
FLAC, OGG, OPUS, WAV como testados — aponta para a documentação do
Android/Media3 como fonte da lista de formatos suportados pela
plataforma. Validar no spike com pelo menos um arquivo de cada formato
que o SPEC pede (seção 5.3 "Validar": "MP3, M4A/AAC, FLAC, OGG, OPUS,
WAV, arquivos sem tag e tags com codificação quebrada").

## Decisão

Usar `@missingcore/react-native-metadata-retriever@3.2.1` (opção a),
não um módulo Kotlin próprio (opção b) nem parser em JS (opção c,
descartada pelo próprio SPEC).

A leitura do código-fonte nativo dá confiança razoável de que
`content://` funciona no caminho principal (Media3), que é o motivo
real de preferir (a) a escrever um módulo próprio do zero — mas isso
**não substitui o teste em dispositivo real**, que é o próximo passo
concreto (tela de spike).

## Consequências

- Versão a fixar: `3.2.1` exata (`--save-exact`), não a `4.0.0-beta.1`
  nem um range solto — mesma disciplina de versionamento já usada para
  `react-native-app-auth` (ADR-002) e as correções de peer dependency
  documentadas na retrospectiva técnica.
- **NÃO VERIFICADO** até rodar o spike em dispositivo: (1) leitura real
  via `content://` de um arquivo dentro de uma árvore SAF escolhida pelo
  usuário (não só teoria do código-fonte); (2) os 7 formatos/casos que o
  SPEC pede testados; (3) se existe campo de duração ou se precisa ser
  calculado a partir de outros campos; (4) desempenho lendo em lotes de
  8 a 16 arquivos com concorrência limitada, como o SPEC pede na seção
  5.3.
- Se o spike confirmar que `content://` falha no caminho principal
  (Media3) apesar da leitura do código-fonte, a opção (b) do SPEC
  (módulo Kotlin próprio com `MediaMetadataRetriever.setDataSource(context, uri)`)
  continua disponível como plano B, atrás da mesma interface de domínio
  (ainda não criada — a criar junto com o spike).
