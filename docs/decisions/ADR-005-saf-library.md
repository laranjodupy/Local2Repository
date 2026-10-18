# ADR-005: Biblioteca para acesso via SAF (Storage Access Framework)

Status: Decidido em 18/10/2026 · Relacionado: `docs/SPEC.md` seção 5.2,
Fase 0 (spikes)

## Contexto

A seção 5.2 do SPEC lista como opção padrão (a) "biblioteca JS de SAF
(por exemplo `react-native-saf-x`, com `openDocumentTree` e listagem,
ou o seletor de diretório de `@react-native-documents/picker`)", com a
regra explícita do projeto de nunca fixar uma dependência sem conferir
README, data de publicação, compatibilidade com Expo/New Architecture, e
versão exata.

## Investigação

**`react-native-saf-x`** (sugerida nominalmente pelo SPEC):
- Última publicação no npm: `2.2.3`, em **03/10/2023** — mais de 3 anos
  sem nenhum update (confirmado via `npm view ... time`).
- README (lido via unpkg) confirma `openDocumentTree(persist)` e
  `listFiles(uriString)`, mas `listFiles` não é recursivo — precisaria
  implementar a recursão na aplicação de qualquer forma.
- Nenhum config plugin Expo próprio encontrado.
- Nenhuma menção a compatibilidade com a New Architecture (Fabric/
  TurboModules) — esperado, já que a lib parou de ser publicada antes
  dessa ser padrão no ecossistema Expo/RN.
- Não é dependência de nada que o projeto já usa — seria mais uma
  dependência externa de terceiro, com risco de abandono real.

**`@react-native-documents/picker`** (segunda opção citada no SPEC):
- Versão recente confirmada (`12.x`), com suporte à New Architecture
  documentado.
- Mas é só um **seletor** (`pickDirectory()` etc.) — não expõe função de
  listagem recursiva de conteúdo dentro da árvore escolhida. Resolveria
  só metade do problema (abrir o picker), não a listagem.
- A documentação do "Directory picker" específico fica sob um caminho
  `/docs/sponsor-only/` no site da biblioteca — não confirmado se é
  recurso pago ou só uma chamada a apoiar o projeto, mas é um sinal de
  alerta que pesou contra.

**`expo-file-system`'s `StorageAccessFramework`** (não estava nas opções
nominais do SPEC, mas é a mesma *categoria* de solução — "biblioteca JS
de SAF" — e cumpre literalmente a função que a seção 5.2 pede):
- **Já é dependência do próprio Expo** (`expo-file-system` é usada
  internamente pelo SDK) — zero dependência nova além do que o projeto
  já carrega por tabela, mantida ativamente pela própria Expo (releases
  frequentes, última `57.0.7` dentro da linha compatível com o SDK 57
  do projeto).
- Inspecionado o `.d.ts` real instalado (não só a documentação, que
  estava incompleta sobre este ponto): existe um namespace
  `StorageAccessFramework` inteiro em
  `expo-file-system/build/legacy/FileSystem.d.ts`, com:
  - `requestDirectoryPermissionsAsync(initialFileUrl?)` → abre o
    seletor nativo (`ACTION_OPEN_DOCUMENT_TREE` por baixo), retorna
    `{ granted: true, directoryUri: string } | { granted: false }`.
  - `readDirectoryAsync(dirUri)` → retorna `Promise<string[]>` com a
    URI completa de cada arquivo/pasta filho (não recursivo — mesma
    limitação que qualquer solução baseada em `DocumentFile` teria,
    exatamente como o SPEC já antecipava).
  - `makeDirectoryAsync`, `createFileAsync`, mais os aliases de
    `writeAsStringAsync`/`readAsStringAsync`/`deleteAsync`/`moveAsync`/
    `copyAsync` — cobrem o que o projeto precisaria além de leitura.
  - A documentação oficial (`docs.expo.dev/versions/v57.0.0/sdk/filesystem/`)
    confirma que o namespace existe e que o Android trata `content://`
    como esquema válido (`File.open()` inclusive documenta uma
    restrição conhecida: "SAF content:// URIs do not support ReadWrite
    mode", o que já avisa para usar modo leitura).
  - Por ser `@platform Android`-only e parte do pacote oficial, a
    compatibilidade com a New Architecture do projeto é garantida pelo
    próprio Expo, não depende de terceiro.

## Decisão

Usar `expo-file-system`'s `StorageAccessFramework` namespace
(`requestDirectoryPermissionsAsync` + `readDirectoryAsync`), não
`react-native-saf-x` nem `@react-native-documents/picker`.

Isso é uma mudança em relação ao exemplo nominal do SPEC (que citava
`react-native-saf-x`), mas permanece dentro da opção (a) da seção 5.2
("biblioteca JS de SAF") — a lib nomeada era um exemplo, não uma
obrigação, e a seção 1 do SPEC pede exatamente este tipo de verificação
antes de fixar uma dependência.

A versão a fixar: `expo-file-system@57.0.7` (ou a mais recente dentro da
faixa `~57.0.x` suportada pelo SDK 57 no momento da instalação —
conferir de novo com `npm view expo-file-system versions` antes de
instalar, já que o Expo publica patches com frequência).

## Consequências

- Nenhuma dependência nova além do que o projeto (via Expo) já carrega
  — reduz superfície de risco de abandono/incompatibilidade.
- `readDirectoryAsync` não é recursivo: o `AudioLibraryProvider` (porta
  de domínio) precisa implementar a recursão chamando
  `readDirectoryAsync` em cada subdiretório encontrado — mesma
  limitação que qualquer alternativa JS teria (confirmado: nenhuma das
  três opções pesquisadas oferece recursão nativa).
- **NÃO VERIFICADO**: tempo e uso de memória reais para listar 1.000 e
  10.000 arquivos (seção 5.2 "Validar") — depende do spike em
  dispositivo real, ainda pendente. Se a listagem recursiva for lenta
  demais, o SPEC já prevê cair para a opção (b) (módulo nativo Kotlin
  com `DocumentsContract`), atrás da mesma interface `AudioLibraryProvider`.
- API usada é a "legacy" do `expo-file-system` (`expo-file-system/legacy`,
  namespace `StorageAccessFramework`) — a API nova
  (`Directory`/`File`/`Paths`) não documenta SAF tree URIs; usar a
  legacy aqui é intencional, não um descuido, porque é onde a
  funcionalidade necessária realmente existe nesta versão do pacote.
- O config plugin do `expo-file-system` (lido em
  `node_modules/expo-file-system/plugin/build/withFileSystem.js`)
  adiciona automaticamente `READ_EXTERNAL_STORAGE`,
  `WRITE_EXTERNAL_STORAGE` e `INTERNET` ao manifest Android. As duas
  primeiras são legadas e sem efeito prático em `targetSdk 36` (Android
  ignora essas permissões para apps que usam SAF a partir da API 29),
  mas aparecem listadas no manifest/ficha da Play Store mesmo assim —
  tensiona um pouco o objetivo do SPEC de "menor escopo possível", vale
  registrar caso apareça em alguma revisão de permissões mais adiante.
  `INTERNET` é necessária de qualquer forma para a integração com a
  YouTube Data API.
