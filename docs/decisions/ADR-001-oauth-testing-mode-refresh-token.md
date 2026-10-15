# ADR-001: Refresh token expira em 7 dias em modo "Testing"

Status: Confirmado em 14/10/2026 · Relacionado: `docs/SPEC.md` seção 3 (VERIFICAR), seção 5.5, `docs/OAUTH_SETUP.md`

## Contexto

A especificação (seção 3) cita que "um app com tela de consentimento externa em
status 'Testing' recebe refresh token que expira em 7 dias e tem limite de 100
usuários de teste", marcado como **VERIFICAR**. Isso afeta diretamente a UX de
qualquer teste fechado prolongado: se verdadeiro, qualquer usuário de teste
precisa reautenticar a cada 7 dias, mesmo sem revogar o acesso manualmente.

## Investigação

Busca na web em 14/10/2026 confirma o comportamento, com a causa raiz sendo o
*status de verificação do app* — não o uso ou a quantidade de reautorizações:

> Em modo "Testing" (app não verificado pelo Google), os refresh tokens
> expiram após 7 dias. Isso vale mesmo que o usuário tenha autorizado o app
> várias vezes.

Fonte: [unipile.com/google-oauth-refresh-token](https://www.unipile.com/google-oauth-refresh-token/)
(terceira, não documentação oficial do Google — a confirmar contra a doc
oficial do Google Identity Platform antes de qualquer decisão de produção).

A mesma fonte lista outras condições de expiração que **também valem em
produção** (não exclusivas do modo Testing), relevantes para o
`QuotaGovernor`/sessão do usuário mais adiante:
- Inatividade de 6 meses sem troca de token no endpoint de token.
- Troca de senha da conta Google (afeta escopos sensíveis/Gmail — não
  necessariamente aplicável ao escopo do YouTube, a confirmar).
- Limite de 50 refresh tokens por par cliente-usuário (o mais antigo é
  revogado silenciosamente ao exceder).
- Revogação manual pelo usuário.

## Decisão

1. Aceitar a limitação de 7 dias como válida para o MVP em modo "Testing".
   Não é bloqueante: o app já trata reautenticação como fluxo normal (seção
   10, "Desconectar"), e o público-alvo do MVP é teste fechado, não
   distribuição ampla.
2. Documentar isso na UI eventualmente (fora do escopo da Fase 0): se o token
   expirar, o erro observado será `invalid_grant` no endpoint de refresh — o
   app deve tratar isso como "sessão expirada, faça login novamente", não
   como erro genérico.
3. Não investir em verificação do app (processo de revisão do Google para
   escopos sensíveis) na Fase 0–2. Isso só se torna relevante se o produto
   avançar para distribuição além de teste fechado (ver seção 5.10,
   opções C/D da spec).

## Consequências

- Nenhuma mudança de código necessária agora — é uma restrição operacional,
  não técnica.
- Risco residual: a fonte não é a documentação oficial do Google. Se o
  comportamento divergir na prática (por exemplo, prazo diferente de 7 dias),
  isso só será descoberto empiricamente durante os spikes de OAuth —
  marcado como item a observar, não a re-verificar via busca.
