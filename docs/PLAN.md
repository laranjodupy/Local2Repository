# Plano — Local2Playlist (pré-Fase 0)

14 de outubro de 2026 · baseado em `docs/SPEC.md` v0.1

## O que é

App Android (React Native + Expo, development build) que lê metadados de músicas de uma pasta local via SAF, busca candidatos no YouTube pela Data API v3 oficial, deixa o usuário revisar manualmente e cria uma playlist na conta dele. Modo exportação (CSV/M3U/TXT, sem OAuth, sem cota) é P0, promovido à Fase 1, antes de qualquer integração com o YouTube.

## Por que essa ordem

A cota do YouTube é o gargalo real do produto (~100 buscas/dia e ~199 inserções/dia por credencial, seção 3 e 9 da spec) e a API não permite consultar saldo restante. Validar metadados, normalização e matching heurístico primeiro — sem gastar cota nem exigir OAuth — é mais barato e desacopla dois riscos técnicos distintos (leitura de arquivo local vs. integração externa).

## Arquitetura (resumo)

Clean-ish: `domain` (TS puro, sem RN, testável em Node) → `ports` (interfaces) → `adapters` (SAF, metadata nativo, SQLite, YouTube, OAuth, quota). UI consome casos de uso via portas, nunca adapters diretamente. Ver seção 6 da spec para a árvore de diretórios completa.

## Stack confirmada

- **Expo** com development build + prebuild (não Expo Go). `.apk` final sai de `android/` nativo via `gradlew assembleRelease` ou EAS Build — compatível com Android Developer / Play Console.
- TypeScript estrito, sem `any` não justificado.
- SQLite (provável `expo-sqlite` ou `op-sqlite` — a confirmar no spike 5.4) para persistência local; sem ORM.
- `react-native-app-auth` para OAuth (PKCE, Custom Tabs); `expo-secure-store` ou `react-native-keychain` para tokens, sempre no Keystore.
- SAF via biblioteca JS no spike inicial (ex. `react-native-saf-x` ou `@react-native-documents/picker`), com `AudioLibraryProvider` como porta — módulo Kotlin nativo só se a listagem recursiva de 5k+ arquivos não performar.
- Leitura de tags via wrapper de `MediaMetadataRetriever` que aceite `content://` diretamente (a confirmar) ou módulo Kotlin próprio.
- Zustand (estado de UI), FlashList (listas longas), react-i18next (PT-BR externalizado), React Navigation ou Expo Router.

Toda dependência nova será conferida (README, última publicação, issues, compatibilidade com New Architecture) e fixada em versão exata antes de entrar no `package.json`, com decisão registrada em ADR quando houver escolha em aberto.

## Fases (seção 13 da spec)

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **0 — Spikes** | ADRs de 5.1–5.6; medições de listagem SAF, formatos de tag lidos, consumo de cota real ao criar playlist de 20–50 faixas | Relatório numérico + decisões fechadas |
| **1 — Pipeline local + exportação** | Seleção de pasta, listagem, metadados, normalização, dedup, revisão local, export CSV/M3U/TXT — sem OAuth | Critérios 1–4 da seção 22 + arquivo importado com sucesso no TuneMyMusic/Soundiiz |
| **2 — Integração YouTube** | OAuth, busca, scoring, revisão, criação de playlist, fila persistente com retomada, `QuotaGovernor`, relatório | Demais itens da seção 22, conta de teste até 50 faixas |
| **3 — Endurecimento** | Acessibilidade, segurança, teste de tráfego, privacidade, E2E, aparelhos reais, docs de OAuth/privacidade | Checklist de pronto (seção 22) |
| **4 — Só se solicitado** | M3U import, modo automático, credencial própria do usuário, MediaStore, iOS | — |

## Riscos principais (não verificados ainda)

1. **Cota efetiva real** — fontes divergem (100 vs. ~66 buscas/dia); será medido empiricamente na Fase 0 criando uma playlist de teste e lendo o Console do Google Cloud.
2. **OAuth em modo Testing** — refresh token expira em 7 dias, limite de 100 usuários de teste; impacto direto em qualquer teste fechado prolongado.
3. **`search.list` aceitar escopo OAuth sem API key** — precisa confirmação empírica (seção 9, VERIFICAR).
4. **Biblioteca de leitura de tags aceitar `content://`** sem cópia do arquivo — testado no spike 5.3.
5. **Políticas do YouTube sobre credencial própria do usuário (opção C, seção 5.10)** — não implementar sem checar Developer Policies.

## O que será registrado em ADR (não decidir informalmente)

5.2 (SAF), 5.3 (leitor de metadados), 5.4 (SQLite), 5.5 (OAuth lib), 5.6 (token storage), 5.7 (background), 5.8 (matching/enriquecimento), 5.9 (navegação/estado/listas).

## Próximo passo imediato

Iniciar Fase 0: criar o projeto Expo, configurar TypeScript estrito, e rodar os spikes de SAF + metadados + OAuth descritos na seção 13, documentando cada um como ADR com números reais.
