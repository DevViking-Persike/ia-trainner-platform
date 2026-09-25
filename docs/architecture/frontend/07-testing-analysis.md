# 07 — Análise de Testes

**Última atualização:** 2026-04-27

> Diagnóstico detalhado em `docs/analysis/frontend/05-diagnostico-testes.md`. Este documento traz a visão arquitetural.

## Stack alvo

| Camada | Ferramenta | Status |
|--------|-----------|--------|
| Type-check | `svelte-check` | ✅ instalado, rodando |
| Unit (TS) | **Vitest** | ❌ não instalado |
| Componente Svelte | **Vitest + `@testing-library/svelte`** | ❌ não instalado |
| E2E Web | **Playwright** | ❌ não instalado |
| Tauri Rust | `cargo test` | ❌ sem testes |

## Zero testes hoje

Não há nenhum `*.test.ts`, `*.spec.ts` ou `#[cfg(test)] mod tests` no repositório atual. Justificativa documentada: v2 ainda em fase MVP com todos os repositories mock; testar mocks é de baixo retorno.

## O que mudará a equação

Recomendação: **instalar Vitest na mesma sprint** em que se criar o **primeiro `*.http.repository.ts`**. A partir desse ponto, testes acompanham cada novo HTTP repository.

## Pirâmide alvo

```
            ▲
            │           E2E (Playwright)
            │           ~10 fluxos críticos
            │           ▲
            │     ▲     │     Componentes Svelte
            │     │     │     (Vitest + Testing Library)
            │     │     ▲     ~30-50 testes
            │     ▲     │     ▲
            │     │     │     │     Use cases (Vitest)
            │     │     │     │     ~80% coverage em application/
            │     │     │     ▲
            │     │     │     │     Type-check (svelte-check)
            ▼     ▼     ▼     ▼     gate de PR
```

Distribuição esperada de quantidade:

| Camada | Testes |
|--------|--------|
| Type-check | implícito |
| Use case unit | ~30-50 (5-10 por módulo) |
| Componente Svelte unit | ~30-50 |
| E2E Playwright | ~10 fluxos |
| Cargo test (Rust) | ~30 (1 por comando crítico) |

## Padrões obrigatórios (ver `.claude/rules/04-testes.md`)

- Mock via `vi.fn()` da **interface** do repository.
- Co-localização: `auth.service.ts` ↔ `auth.service.test.ts` no mesmo dir.
- E2E em `tests/e2e/`.
- Padrão **Arrange-Act-Assert** com nomes descritivos.
- Testes **determinísticos**: usar `vi.useFakeTimers()` em vez de `Date.now()` real.
- Sem fetch real em testes. Sempre mock.

## CI mínimo proposto

`.github/workflows/test.yml`:

```yaml
name: test
on: [pull_request]
jobs:
  check-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd Frontend && npm ci
      - run: cd Frontend && npm run check
      - run: cd Frontend && npm run test:run
```

Pipeline noturno (futuro) para Playwright E2E.

## Riscos

- **Adoção tardia**: cada use case que entra em produção sem teste vira débito.
- **Tauri mobile sem cobertura**: `cargo test` cobre lib, não dispositivos. E2E mobile exigirá ferramenta dedicada (Appium ou similar).
- **Flaky tests**: mocks elaborados podem virar fragile — manter mocks simples.

## Checklist antes de cada PR (futuro)

- [ ] `npm run check` passa
- [ ] `npm run test:run` passa
- [ ] Caso de uso novo? Tem 3+ testes (sucesso, erro, validação)?
- [ ] Componente novo? Tem teste de render + interação principal?
- [ ] Comando Rust novo? Tem `cargo test`?
- [ ] (Para PRs grandes) E2E adicionado se fluxo novo?
