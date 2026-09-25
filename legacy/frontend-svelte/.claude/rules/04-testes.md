# Regras de Testes

**Objetivo:** Cobertura progressiva, priorizando casos de uso (Hexagonal application) e regras de domínio.

## Stack alvo

| Camada | Ferramenta |
|--------|-----------|
| Type-check | `svelte-check` (`npm run check`) |
| Unit (TS puro: casos de uso, utils, repositories) | **Vitest** |
| Componentes Svelte | **Vitest + @testing-library/svelte** |
| E2E | **Playwright** (apenas Web — Tauri E2E é separado) |
| Tauri (Rust) | `cargo test` em `src-tauri/` |

> Vitest e Playwright **não estão instalados ainda**. Adicionar como devDependencies quando começar a escrever testes (`npm i -D vitest @testing-library/svelte jsdom @playwright/test`). Preencher `package.json scripts.test` e `scripts.test:e2e`.

## Localização

- Testes unitários ficam **co-localizados** com o arquivo testado: `auth.service.ts` → `auth.service.test.ts` no mesmo diretório.
- E2E ficam em `tests/e2e/`.
- Testes Rust ficam em `src-tauri/src/<modulo>.rs` (módulo `#[cfg(test)] mod tests`) ou em `src-tauri/tests/`.

## Obrigatório

- Todo **caso de uso novo** em `lib/server/<modulo>/application/` DEVE ter testes cobrindo: sucesso, erro de domínio, erro de infraestrutura, validação de input.
- Testes de caso de uso DEVEM mockar a interface do repository (não a implementação concreta). Sem `vi.mock` de `infrastructure/...`.
- Toda **regra de validação** (senha, email, CPF, etc.) DEVE ter testes parametrizados (`it.each` / `test.each`).
- Padrão Arrange-Act-Assert. Nomes descritivos: `metodo > cenario > resultadoEsperado` (ou `describe > it`).
- Mock via `vi.fn()` direto. **PROIBIDO** mocks manuais (classes fake) quando `vi.fn()` resolve.
- Testes de componente Svelte: render → interação (`fireEvent` ou `userEvent`) → assert no DOM. Não testar implementação interna (estado de `$state`).

## Permitido

- Testes de página (`+page.server.ts` `load`/`action`) PODEM usar fixtures JSON reais.
- Páginas pequenas (sem regra de negócio) PODEM ficar sem unit tests, cobertas apenas por E2E.
- `it.each` para múltiplas variações de input.
- Testes de integração com Testcontainers (Postgres real) PODEM viver em `tests/integration/` se um caso justificar.

## Proibido

- PROIBIDO commitar caso de uso novo sem ao menos 3 testes (sucesso, erro, validação).
- PROIBIDO usar `Date.now()` ou `new Date()` direto em código testável. Injetar `Clock` ou usar `vi.useFakeTimers()`.
- PROIBIDO testar detalhes internos (ex: ordem exata de chamadas privadas) — testar comportamento observável.
- PROIBIDO usar fetch real em testes — sempre mock do repository.
- PROIBIDO E2E que dependa de backend real em CI. Rodar contra mocks ou stub server.

## Sinais de alerta

- Caso de uso intestável sem refactor — provável dependência direta de `infrastructure/`.
- Teste que quebra ao renomear métodos privados — testando implementação, não comportamento.
- Componente Svelte com estado complexo sem testes.
- Uso de `setTimeout` / `await new Promise(r => setTimeout(r, ...))` em testes — usar fake timers.
