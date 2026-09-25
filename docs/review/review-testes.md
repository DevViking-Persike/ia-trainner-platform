# Review de Testes — IA Trainner v2

**Data:** 2026-04-27
**Escopo:** Cobertura de testes na branch `dev` do submodule Frontend.

## Resultado: 🔴 ZERO

| Métrica | Valor |
|---------|-------|
| Arquivos `*.test.ts` / `*.spec.ts` | **0** |
| Testes Rust (`#[cfg(test)] mod tests`) | **0** |
| Vitest instalado | ❌ |
| `@testing-library/svelte` instalado | ❌ |
| Playwright instalado | ❌ |
| Cobertura de `application/` | 0% |
| CI bloqueando regressão | ❌ |

## Análise

Bloqueador absoluto para promoção à produção. A v2 está estruturada para ser **fácil de testar** (Hexagonal puro, services com factory, tipos compartilhados), mas a stack ainda não foi instalada.

Conformidade com `.claude/rules/04-testes.md`:
- ❌ "Todo caso de uso novo DEVE ter testes cobrindo: sucesso, erro de domínio, erro de infraestrutura, validação de input."
- ❌ "Toda regra de validação DEVE ter testes parametrizados."
- ❌ "Todo componente novo DEVE ter teste de render + interação."

## O que existe que se aproxima de teste

- `npm run check` (svelte-check + tsc): ✅ ativo. Cobre tipos, slots, props inválidos, imports inválidos.

Isso é insuficiente como cobertura, mas é uma camada de defesa básica.

## Plano de instalação

Detalhado em `docs/analysis/frontend/05-diagnostico-testes.md`. Resumo:

### Fase 0 (~1h)
```bash
cd Frontend
npm i -D vitest @testing-library/svelte jsdom @playwright/test
```

### Fase 0.5 — config (~30min)
- `vitest.config.ts` com plugin SvelteKit
- `package.json`:
  ```json
  "test": "vitest",
  "test:run": "vitest run",
  "test:e2e": "playwright test"
  ```
- `playwright.config.ts`

### Fase 0.7 — CI (~30min)
- `.github/workflows/test.yml`:
  ```yaml
  - run: npm ci
  - run: npm run check
  - run: npm run test:run
  ```

### Fase 1 — primeiros testes (~1-2 dias)
Casos de uso prioritários:
- `auth/application/authenticate-user.test.ts`
- `auth/application/register-user.test.ts`
- `dashboard/application/get-dashboard-overview.test.ts`
- `serverStatus/application/get-server-status.test.ts`

Cada um com pelo menos 3 testes (sucesso, erro, validação).

### Fase 2+ — incremental
- Cada novo `*.http.repository.ts` nasce com teste mockando `fetch`.
- Cada componente extraído em `design-system/` nasce com teste de render + interação.
- E2E para login → dashboard → feature crítica.

## Risco de seguir sem testes

| Mudança futura | Risco sem testes |
|----------------|-------------------|
| Trocar `auth.mock.repository` por `auth.http.repository` | Alto — payload pode divergir do esperado |
| Adicionar JWT real | Alto — fluxo de auth pode quebrar silenciosamente |
| Refatorar caso de uso para regra nova | Médio — comportamento difícil de validar |
| Adicionar componente do DS | Baixo — visual fácil de detectar |
| Adicionar comando Rust novo | Médio — IPC bug difícil de reproduzir |

## Ações imediatas

1. ✅ **Manter como está** durante MVP transição (decisão consciente, documentada).
2. 🔥 **Mudar agora** se começar a tocar em `auth.repository` ou `hooks.server.ts` (auth flow).
3. 🔥 **Mudar antes** de Fase B (HTTP repos) começar.

## Próximo review de testes

Após instalação da stack e primeiros 3-5 testes em casos de uso. Esperado em 2 semanas conforme roadmap.
