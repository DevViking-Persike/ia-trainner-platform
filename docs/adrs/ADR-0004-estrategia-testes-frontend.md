# ADR-0004 — Estratégia de Testes com Vitest + Testing Library + Playwright

## Status
Proposto

## Data
2026-04-27

## Contexto
A v2 está nascendo com pouca cobertura de testes. Casos de uso em `lib/server/<modulo>/application/` já têm formato testável (recebem repository por construtor), mas a stack de testes ainda não foi configurada. Decidir cedo a stack evita reescrita futura.

Lição do v1 (Blazor + xUnit + NSubstitute): testes valiosos foram os de ViewModel mockando interfaces de service; o restante (testes de Razor render) deu pouco retorno em relação ao custo.

## Decisão
Adotar a seguinte stack:

| Camada | Ferramenta | Motivo |
|--------|-----------|--------|
| Type-check | `svelte-check` (já instalado) | Cobre boa parte das classes de bug, gratuito |
| Unit (TS puro) | **Vitest** | Vite-native, rápido, API similar a Jest, ESM-first |
| Componentes Svelte | **Vitest + `@testing-library/svelte` + jsdom** | Padrão atual da comunidade Svelte 5 |
| E2E (Web) | **Playwright** | Multi-browser, headless, screenshot/trace |
| Tauri Rust | `cargo test` | Padrão Rust |

- Testes co-localizados com o arquivo (`auth.service.ts` → `auth.service.test.ts`).
- E2E em `tests/e2e/`.
- Mocking via `vi.fn()` da interface do repository — nunca da implementação concreta.

## Alternativas consideradas
- **Jest** — descartado: incompatibilidade ESM histórica, mais lento que Vitest, configuração mais pesada.
- **Cypress (E2E)** — descartado: Playwright superior em multi-browser e velocidade, com API mais limpa para CI.
- **bUnit-equivalente Svelte (`@testing-library/svelte` é o mais próximo)** — escolhido como padrão.

## Consequências
**Ganhos**
- Vitest aproveita config Vite que já existe — zero overhead inicial.
- Casos de uso Hexagonal são testáveis sem ambiente DOM.
- Playwright permite gravar fluxos de UI completos como E2E.

**Trade-offs**
- Cobertura inicial vai ser baixa — ramp-up gradual.
- Tauri E2E não é coberto por Playwright — exigirá `tauri-driver` + WebDriver no futuro se quisermos cobrir o shell nativo.
- Vitest com Svelte 5 + jsdom ainda tem alguns bugs de edge case (workarounds documentados).

## Impacto em código, testes e operação
- Adicionar dependências:
  ```bash
  npm i -D vitest @testing-library/svelte jsdom @playwright/test
  ```
- Criar `vitest.config.ts` com plugin SvelteKit e configurar `test.setupFiles` para limpeza de DOM.
- Adicionar scripts em `package.json`:
  ```json
  "test": "vitest",
  "test:e2e": "playwright test"
  ```
- CI inicial pode rodar apenas `npm run check && npm test`. E2E pode entrar em pipeline noturno.
- Cobertura mínima inicial recomendada: casos de uso novos (regra `04-testes.md`).

## ADRs relacionados
- ADR-0005 — Arquitetura Hexagonal SSR + SPA (define o que precisa ser testado prioritariamente)
