# 09 — Evolução Recomendada

**Última atualização:** 2026-04-27

## Norte

Tornar a v2 **funcionalmente equivalente à v1** (Blazor) e **arquiteturalmente superior**, mantendo o codebase enxuto e testável.

## Fases

### Fase A — Fundação (~3-5 dias)
**Objetivo**: estabilizar bases de qualidade.

- A.1. Instalar Vitest + Testing Library + jsdom + Playwright; criar `vitest.config.ts`.
- A.2. CI mínimo (`.github/workflows/test.yml`) rodando `check + test:run` em PRs.
- A.3. Cookie `secure: true` em produção.
- A.4. Guard de auth cobrindo `/profile` e `/teams`.
- A.5. Adicionar `--font-size-*` em `app.css`.

### Fase B — HTTP repositories + JWT (~10-15 dias)
**Objetivo**: conectar a backends reais.

- B.1. `auth.http.repository.ts` apontando ao Lambda Keycloak.
- B.2. Validação JWT real em `hooks.server.ts` (`verifySession`).
- B.3. `dashboard.http.repository.ts` (TrainingService).
- B.4. `models.http.repository.ts` (TrainingService → Ollama).
- B.5. `serverStatus.http.repository.ts`.
- B.6. `teams.http.repository.ts`.
- B.7. `rag.http.repository.ts` (incluindo upload multipart).
- B.8. Cada repo nasce com testes Vitest mockando fetch.

### Fase C — Tauri Rust real (paralelo a Fase B, ~5-7 dias)
- C.1. Refatorar `commands.rs` para usar `reqwest` ao invés de mocks.
- C.2. Adicionar logging com `log::*` macros.
- C.3. Definir `capabilities/*.json` específicas (network scope, fs scope).
- C.4. Adicionar `cargo test` para principais comandos.

### Fase D — Design System mínimo (~5-7 dias)
- D.1. Atoms: `Button`, `Input`, `Spinner`, `Badge`, `Avatar` com testes.
- D.2. Molecules: `FormField`, `Card`, `Alert`, `EmptyState`, `PageHeader`.
- D.3. Migrar pages para usar componentes novos.

### Fase E — UX e a11y (~3-5 dias)
- E.1. Auditoria com `axe-core` ou Lighthouse.
- E.2. `aria-label` em ícones e botões icon-only.
- E.3. `:focus-visible` consistente.
- E.4. Skeleton states em listas.
- E.5. Error boundaries (`+error.svelte`) por grupo.

### Fase F — Deploy (~3-5 dias)
- F.1. Dockerfile para SSR (Node 22 + adapter-auto build).
- F.2. Manifesto K8s para v2 (provavelmente Oracle A2 ARM64 ou Ganesha AMD64 — definir).
- F.3. Deploy controlado (canary).
- F.4. Descomissionar v1 (Blazor) após validação.

### Fase G — Backlog (sem ordem fixa)
- G.1. Telemetria (Sentry browser ou OTEL web).
- G.2. E2E Playwright cobrindo fluxos críticos.
- G.3. Service Worker / cache offline em Tauri.
- G.4. PWA install prompts.
- G.5. ChatPanel organism (unificar RAG e Models chat).

## Princípios para a evolução

1. **Cada PR estrutural atualiza documentação.** Refatoração de mock → HTTP toca `08-migracoes-pendentes.md` e este documento.
2. **Testes acompanham mudança de contrato.** `*.http.repository.ts` novo nasce testado.
3. **Sem big-bang.** Fases B/C podem ir um módulo por vez (auth → dashboard → models → ...).
4. **Disciplina cross-mode.** Cada feature precisa ter implementação Web SSR e comando Rust Tauri sincronizados.
5. **Resistir ao impulso de adicionar features novas** antes da paridade com v1.

## Métricas de saída por fase

| Fase | Métrica de saída |
|------|------------------|
| A | CI passa em PR; cookie secure; tokens tipográficos em uso |
| B | 6/6 módulos com HTTP repository + JWT real |
| C | 7 áreas de comandos Rust com HTTP real + logging |
| D | ≥ 10 componentes em `design-system/` com testes |
| E | Lighthouse a11y ≥ 90 em pages principais |
| F | v2 em produção; v1 desligada |
| G | conforme demanda |

## Riscos da evolução

- **Drift Web ↔ Tauri**: mitigar com checklist em PR.
- **Backend instável**: mitigar com mocks fallback em dev.
- **Tauri 2 mobile**: dependências ainda evoluindo — manter `@tauri-apps/api` e `@tauri-apps/cli` up-to-date.
- **Solo dev / cadência**: estimativa total ~6-8 semanas de calendário (sem paralelismo real).

## Quando reavaliar este documento

- Após cada fase concluída (atualizar status).
- Quando uma decisão arquitetural mudar (registrar nova ADR e atualizar referências aqui).
- Anualmente, mesmo sem mudanças (verificar relevância e remover faseamentos obsoletos).
