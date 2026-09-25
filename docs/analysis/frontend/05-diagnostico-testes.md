# 05 — Diagnóstico de Testes (v2)

**Data:** 2026-04-27
**Escopo:** Estado atual da cobertura de testes na v2.

## Estado atual

❌ **Zero testes implementados.**

| Categoria | Encontrado |
|-----------|-----------|
| Arquivos `*.test.ts` / `*.spec.ts` | 0 |
| Pasta `tests/` | inexistente |
| Vitest no `package.json` | ausente |
| `@testing-library/svelte` no `package.json` | ausente |
| Playwright no `package.json` | ausente |
| Testes Rust em `src-tauri/` | 0 (nenhum `#[cfg(test)] mod tests`) |
| `vitest.config.ts` | ausente |
| `.github/workflows/*.yml` (CI) | ausente |

## O que SeT pode bater

A única verificação automatizada existente é:
```bash
npm run check     # svelte-check + tsc -- type-check
```

Cobre:
- Tipos TypeScript (strict mode)
- Validação Svelte de markup, slots, props
- Detecção de imports inválidos

Não cobre:
- Comportamento em runtime
- Regressões de UI
- Lógica de casos de uso
- Fluxos auth, permissão, navegação
- Renderização correta de componentes

## Por que zero é aceitável agora (e por que precisa mudar)

**Aceitável**:
- v2 é MVP de transição com todos os repositories em mock — testar mocks tem retorno marginal.
- Casos de uso ainda não foram conectados a backends reais; testar lógica triada por mocks dá falsa confiança.
- Equipe é solo-dev; investir em testes antes de estabilizar contratos é prematuro.

**Precisa mudar antes de**:
- Conectar primeiro repository HTTP real (qualquer `.http.repository.ts`).
- Promover a v2 a deploy público.
- Aceitar contribuições externas (PR sem testes vira risco).

## Plano em fases

### Fase 0 — instalar stack (≤ 1 hora)
```bash
npm i -D vitest @testing-library/svelte jsdom @playwright/test
```
- Criar `vitest.config.ts` com plugin SvelteKit + jsdom
- Adicionar scripts em `package.json`:
  ```json
  "test": "vitest",
  "test:e2e": "playwright test",
  "test:run": "vitest run"
  ```
- Adicionar workflow CI (`.github/workflows/test.yml`) que roda `npm run check && npm run test:run` em pull-requests.

### Fase 1 — casos de uso (1-2 dias)
- Para cada caso de uso em `lib/server/<modulo>/application/` (cerca de 12 use cases): pelo menos 3 testes (sucesso, erro de domínio, validação).
- Mock do repository via `vi.fn()`.
- Cobertura mínima alvo: 80% das linhas em `application/`.

### Fase 2 — design system (3-5 dias)
- Cada componente novo extraído (`Button`, `Input`, `Card`, etc.) deve nascer com teste de render + interação principal.
- Componentes existentes (`Sidebar`, `Notifications`) ganham retroativamente.

### Fase 3 — fluxos críticos E2E (1 semana)
- Login → dashboard → criar coleção → upload → query
- Login → criar team → convidar → ver membros
- Tema toggle persiste

### Fase 4 — testes Rust (paralelo)
- Cada `#[tauri::command]` ganha pelo menos 1 teste em `src-tauri/src/commands.rs` (módulo `#[cfg(test)] mod tests`).
- Mock `AppHandle` quando necessário ou usar `tauri::test`.

## Métricas-alvo (longo prazo)

| Camada | Cobertura mínima |
|--------|------------------|
| `application/<usecase>` | 80% linhas |
| `infrastructure/<modulo>.http.repository` | 70% (mockando fetch) |
| Componentes do design system | 60% linhas |
| Páginas (`+page.svelte`) | E2E apenas; não unit |
| Comandos Rust | 60% via `cargo test` |

## Risco de seguir sem testes

A v2 está estruturada para ser fácil de testar (Hexagonal puro, services com factory). Mas **cada dia sem testes** aumenta o débito quando os HTTP repositories chegarem — porque mudanças em `infrastructure/` poderão regredir comportamento sem detecção.

Recomendação: adicionar Vitest na **mesma sprint** que criar o primeiro `*.http.repository.ts`.
