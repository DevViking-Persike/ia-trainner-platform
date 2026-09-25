# 04 — Mapa de Reaproveitamento (v2)

**Data:** 2026-04-27
**Escopo:** Identificar duplicação real entre páginas e componentes, listar candidatos a extração.

## Métrica usada

Regra dos **3+ usos** (definida em `.claude/rules/03-reaproveitamento.md`): padrão de markup que aparece em ≥ 3 páginas vira componente; em 2, pode permanecer duplicado.

## Componentes existentes

Pasta `src/lib/design-system/organisms/`:

| Componente | Usos | Status |
|------------|------|--------|
| `Sidebar.svelte` | `(app)/+layout.svelte` | 1 uso (esperado, é layout) |
| `Notifications.svelte` | `(app)/+layout.svelte` (provavelmente) | 1 uso (esperado, é layout) |

## Candidatos detectados

### Atoms (alta prioridade)

| Padrão | Ocorrências | Onde |
|--------|-------------|------|
| **Botão primário** (login, cadastro, criar coleção, criar team, etc.) | 6+ | `(auth)/login`, `(auth)/cadastro`, `(app)/rag`, `(app)/teams`, `(app)/training`, `(app)/profile` |
| **Input com label** (email, senha, nome, etc.) | 8+ | `(auth)/login`, `(auth)/cadastro`, `(app)/profile`, `(app)/rag`, `(app)/teams` |
| **Spinner / Loading state** | 4+ | dashboards, listas |
| **Badge / Tag** (status, tipo, role) | 5+ | jobs, modelos, teams, RAG |
| **Avatar / Identicon** | 2-3 | Sidebar (user atual), teams (membros), profile |

### Molecules (alta prioridade)

| Padrão | Ocorrências | Onde |
|--------|-------------|------|
| **Card** (com título + body + footer opcional) | 5+ | dashboard cards, RAG collections, jobs, teams, models |
| **Alert / Toast inline** (form errors, sucessos) | 4+ | login, cadastro, criar coleção, criar team |
| **EmptyState** (lista vazia) | 4+ | RAG (sem coleções), teams, training (sem jobs), models |
| **PageHeader** (título + actions) | 6+ | dashboard, RAG, models, teams, training, server |
| **FormField** (label + input + error) | 6+ | login, cadastro, criar coleção, profile, criar team |

### Organisms (média prioridade)

| Padrão | Ocorrências | Onde |
|--------|-------------|------|
| **JobList** | 1-2 | dashboard, training |
| **CollectionList** | 1-2 | dashboard, RAG |
| **MemberList** | 1 | teams |
| **ChatPanel** (mensagens + input) | 2 | `(app)/models/chat`, `(app)/rag/chat` |
| **ServerStatusCard** (GPU/RAM/jobs) | 1-2 | dashboard, server |

### Templates (baixa prioridade)

| Padrão | Status |
|--------|--------|
| `AppLayout` (sidebar + content + notifications) | já em `(app)/+layout.svelte` — migrar para `templates/AppLayout.svelte` quando vier mais que um app layout |
| `AuthLayout` (centralizado, sem sidebar) | implícito em `(auth)/+layout.svelte` (provável) |

## Lógica candidata a `lib/utils/`

Padrões de função pura que podem se repetir e merecem extração:

- **Validação de senha** (12+ chars, maiúscula, minúscula, número) — vista em login/cadastro. Hoje provavelmente inline.
- **Formatação de data relativa** (`há 3 minutos`, `ontem`) — provável uso em jobs, chat history, notifications.
- **Formatação de bytes** (`12.4 GB`, `1.2 TB`) — server status, RAG documents.
- **Truncamento de texto** com ellipsis — listas.
- **Parser de JWT claims** (quando JWT real chegar).

## Plano sugerido de extração

### Sprint 1 (alta prioridade)
1. `atoms/Button.svelte` — variantes `primary`, `secondary`, `ghost`, `danger`
2. `atoms/Input.svelte` — text, email, password, com slots para prefix/suffix
3. `atoms/Spinner.svelte` — variante size (`sm`, `md`, `lg`)
4. `atoms/Badge.svelte` — variantes semânticas
5. `molecules/FormField.svelte` — label + input + error message

### Sprint 2 (média prioridade)
6. `molecules/Card.svelte` — slots header/body/footer
7. `molecules/Alert.svelte` — variantes semânticas
8. `molecules/EmptyState.svelte` — ícone + título + descrição + slot ação
9. `molecules/PageHeader.svelte` — título + slot ações

### Sprint 3 (organisms quando vir necessidade)
10. `organisms/ChatPanel.svelte` — unifica RAG chat e Models chat
11. `organisms/JobList.svelte` — unifica dashboard mini-list e training full-list

## Riscos de abstração prematura

- `ChatPanel`: as duas UIs (RAG e Models) podem divergir sutilmente — extrair APENAS quando ambas estabilizarem. Hoje é seguro deixar duplicado.
- `Button`: criar com 8+ props é sinal de abstração demais. Manter 3-4 props (variant, size, disabled, loading).
- `Card`: tentação de criar `<Card title=... body=... footer=...>` em vez de slots — preferir snippets Svelte 5 (`{#snippet}` / `{@render}`).
