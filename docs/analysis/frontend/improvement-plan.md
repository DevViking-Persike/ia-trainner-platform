# Plano de Melhorias — Frontend IA Trainner (v2)

**Atualizado:** 2026-04-27
**Escopo:** Roadmap consolidado pós-migração para SvelteKit + Tauri.

## Princípios

1. **Estabilizar antes de otimizar.** Conectar HTTP repositories vem antes de adicionar features novas.
2. **Testes acompanham mudança de contrato.** Cada `.http.repository.ts` novo nasce com Vitest.
3. **Promover deploy SSR só após auditoria a11y mínima.**
4. **Documentação atualizada em cada PR estrutural.**

## Sprint 1 (próximas 2 semanas) — fundação

| # | Item | Esforço | Justificativa |
|---|------|---------|---------------|
| 1.1 | Instalar stack de testes (Vitest + Testing Library + jsdom + Playwright) | 0.5d | `.claude/rules/04-testes.md` |
| 1.2 | Criar `vitest.config.ts` + scripts em `package.json` | 0.5d | Pré-requisito para 1.4 |
| 1.3 | Criar workflow CI mínimo (`.github/workflows/test.yml`) | 0.5d | Bloquear regressão em PRs |
| 1.4 | Substituir `auth.mock.repository.ts` por `auth.http.repository.ts` apontando ao Lambda Keycloak | 2-3d | Item #1 de `08-migracoes-pendentes.md` |
| 1.5 | Migrar cookie base64 para JWT real (validação em `hooks.server.ts` via `verifySession`) | 1-2d | Item #2 de migrações |
| 1.6 | Testes Vitest para `authenticate-user` + `register-user` use cases | 1d | Casos de uso = primeiro alvo |
| 1.7 | Adicionar prefixos `/profile` e `/teams` ao guard em `hooks.server.ts` | 0.25d | Lacuna identificada em `06-regras-geradas.md` |

## Sprint 2 — design system mínimo

| # | Item | Esforço | Justificativa |
|---|------|---------|---------------|
| 2.1 | Criar `atoms/Button.svelte` + variants + testes | 1d | 6+ usos identificados |
| 2.2 | Criar `atoms/Input.svelte` + testes | 1d | 8+ usos |
| 2.3 | Criar `atoms/Spinner.svelte` + `atoms/Badge.svelte` | 0.5d | Reuso médio |
| 2.4 | Criar `molecules/FormField.svelte` (label + input + error) | 0.5d | Composição direta |
| 2.5 | Criar `molecules/Card.svelte` + slots via snippets | 0.5d | 5+ usos |
| 2.6 | Criar `molecules/Alert.svelte` + `molecules/EmptyState.svelte` + `molecules/PageHeader.svelte` | 1.5d | 4-6 usos cada |
| 2.7 | Adicionar tokens tipográficos `--font-size-*` em `app.css` | 0.25d | Falta detectada em `03-design-system.md` |
| 2.8 | Migrar pages para usar componentes novos | 2-3d | Substituir markup duplicado |

## Sprint 3 — repositories HTTP restantes

| # | Item | Esforço | Backend |
|---|------|---------|---------|
| 3.1 | `dashboard.http.repository.ts` + testes | 1d | TrainingService |
| 3.2 | `models.http.repository.ts` + testes | 1d | TrainingService → Ollama |
| 3.3 | `serverStatus.http.repository.ts` + testes | 1d | TrainingService |
| 3.4 | `teams.http.repository.ts` + testes | 1.5d | TrainingService |
| 3.5 | `rag.http.repository.ts` (incluindo upload multipart) + testes | 2-3d | Ares.Rag.Api |

> Após Sprint 3, **todos os módulos** rodam contra backends reais. v2 fica funcionalmente equivalente à v1.

## Sprint 4 — Tauri Rust real (paralelo a Sprint 3)

| # | Item | Esforço |
|---|------|---------|
| 4.1 | Refatorar `src-tauri/src/commands.rs` para chamar HTTP backends (não mock) | 3-5d |
| 4.2 | Adicionar logging estruturado (`log::info!` / `tracing`) | 0.5d |
| 4.3 | Definir `capabilities/*.json` específicas (network, fs scope) | 1d |
| 4.4 | Testes `cargo test` para principais comandos | 2d |

## Sprint 5 — UX e polish

| # | Item |
|---|------|
| 5.1 | Auditoria de a11y (axe + manual) em todas as pages |
| 5.2 | Adicionar `aria-label` em ícones e botões icon-only |
| 5.3 | Verificar `:focus-visible` em todos os interativos |
| 5.4 | Skeleton/loading states consistentes em listas |
| 5.5 | Error boundaries SvelteKit (`+error.svelte`) por grupo |

## Sprint 6 — deploy

| # | Item |
|---|------|
| 6.1 | Dockerfile para SSR (Node 22 + adapter-auto build) |
| 6.2 | Manifesto K8s para v2 substituir versão Blazor |
| 6.3 | Deploy controlado (canary ou blue-green) |
| 6.4 | Tirar v1 (Blazor) do ar |

## Sprint 7+ — backlog (sem prioridade definida)

- Telemetria web (Sentry ou OTEL browser)
- E2E Playwright cobrindo fluxos críticos
- Service worker / cache offline (Tauri)
- i18n se houver demanda multilíngue
- ChatPanel organism unificando RAG e Models
- PWA install prompts (Web)

## Métricas de sucesso

| Métrica | Hoje | Meta após Sprint 6 |
|---------|------|---------------------|
| Mock repositories | 6/6 | 0/6 |
| Auth JWT real | ❌ | ✅ |
| Cobertura unit tests (use cases) | 0% | ≥ 80% |
| CI rodando em PR | ❌ | ✅ |
| Componentes do DS | 2 (organisms) | ~12-15 |
| Deploy v2 público | ❌ | ✅ |
| v1 (Blazor) descomissionada | ❌ | ✅ |

## Riscos

- **Drift entre Web e Tauri** ao adicionar features sem disciplina cross-mode.
- **Backend instável** durante migração — reservar tempo para ajustar mapeamentos.
- **Tauri 2 mobile** ainda em evolução — algumas APIs podem mudar (manter dependências up-to-date).
- **Solo dev** — Sprint sequencial, sem paralelismo. Esforço total estimado: ~6-8 semanas até v2 em produção.
