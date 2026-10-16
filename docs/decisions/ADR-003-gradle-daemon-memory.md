# ADR-003: Aumentar heap/metaspace do Gradle Daemon via config plugin

Status: Decidido em 16/10/2026 · Relacionado: `docs/SPEC.md` seção 13 (Fase 0, spikes)

## Contexto

Daniel rodou `npx expo prebuild -p android` + `gradlew assembleRelease` na
máquina Windows dele (Android Studio + SDK já instalados). O build
terminou com `BUILD SUCCESSFUL in 1h 12m 45s`, mas o terminal pareceu
travado/sem output porque, logo depois do sucesso, apareceu:

```
Exception in thread "Thread-4" org.gradle.launcher.daemon.client.DaemonConnectionException: Could not dispatch a message to the daemon.
```

## Investigação

O próprio log do build já explicava a causa, mais acima:

```
The Daemon will expire after the build after running out of JVM Metaspace.
The project memory settings are likely not configured or are configured to
an insufficient value.
...
The currently configured max heap space is '2 GiB' and the configured max
metaspace is '512 MiB'.
...
Daemon will be stopped at the end of the build after running out of JVM
Metaspace
```

O `problems-report.html` anexado por Daniel (relatório "Incubating" de
configuration-cache problems do Gradle) foi inspecionado à parte: 38
diagnósticos, todos `WARNING`/`ADVICE` (avisos de sintaxe Gradle DSL
depreciada em dependências de terceiros — `expo`, `react-native-*` — que
só vão quebrar na Gradle 10, não na 9.3.1 usada aqui), zero `ERROR`. Não
relacionado à exceção do daemon.

Conclusão: **o build teve sucesso** (`610 actionable tasks: 610 executed`,
artefato gerado em `android/app/build/outputs/apk/release/`). A exceção
aconteceu durante o encerramento do daemon, depois do trabalho concluído,
porque o heap/metaspace configurado por padrão pelo Gradle (2 GiB / 512
MiB) é pequeno para este projeto — Expo + compilação nativa C++/CMake
para 4 ABIs (arm64-v8a, armeabi-v7a, x86, x86_64) + Reanimated.

Um daemon que morre por falta de memória não derruba o build em
andamento, mas não fica vivo para ser reaproveitado — toda build seguinte
paga JVM cold-start completo de novo, o que compõe com o tempo já alto
(1h12min) deste projeto.

## Decisão

Criar `plugins/withGradleJvmArgs.js`, um config plugin Expo local que usa
`withGradleProperties` (API pública de `@expo/config-plugins`, confirmada
em `node_modules/@expo/config-plugins/build/plugins/android-plugins.d.ts`
nesta sessão) para escrever/substituir `org.gradle.jvmargs` em
`android/gradle.properties` com:

```
-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError
```

Registrado em `app.json` → `expo.plugins`. Necessário como plugin (não
edição direta do arquivo) porque `android/` é gerado pelo
`expo prebuild` e está no `.gitignore` — qualquer edição manual se perde
no próximo `prebuild --clean`.

Valores escolhidos como o dobro dos defaults observados no log (2 GiB →
4 GiB heap, 512 MiB → 1 GiB metaspace), não medidos contra o pico real de
uso — **não verificado** se é o número certo para este projeto
especificamente. `-XX:+HeapDumpOnOutOfMemoryError` adicionado para que,
se mesmo assim faltar memória, sobre um heap dump para diagnóstico em vez
de só a mensagem genérica de metaspace.

## Consequências

- Precisa de `npx expo prebuild --clean` para o plugin ser aplicado (ou
  qualquer prebuild subsequente, já que `android/` é sempre regenerado).
- Se a máquina de build tiver menos de ~4-5 GiB de RAM livre, esses
  valores podem causar o problema oposto (OOM do processo, não do
  metaspace) — não testado contra hardware limitado.
- Não resolve o tempo de build em si (1h12min é sobretudo compilação
  nativa C++ para 4 arquiteturas + download do NDK/CMake na primeira
  vez) — resolve apenas o daemon morrer depois.
