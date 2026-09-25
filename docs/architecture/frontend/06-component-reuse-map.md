# 06 — Mapa de Reaproveitamento

**Última atualização:** 2026-04-27

> Para diagnóstico cru com contagens e plano sprint-a-sprint, ver `docs/analysis/frontend/04-mapa-reaproveitamento.md`. Aqui o foco é arquitetural.

## Princípio

**Regra dos 3+ usos**: padrão de markup que aparece em ≥ 3 páginas vira componente. Em 2, pode permanecer duplicado. Definida em `.claude/rules/03-reaproveitamento.md`.

## Hierarquia (Atomic Design)

```
src/lib/design-system/
├── atoms/         (Button, Input, Badge, Spinner, Avatar)
├── molecules/     (Card, Alert, FormField, EmptyState, PageHeader)
├── organisms/     (Sidebar, Notifications, ChatPanel*, JobList*, MemberList*)
└── templates/     (AppLayout, AuthLayout)
```

\* candidatos futuros, não criados ainda.

## O que existe hoje

| Componente | Nível | Status |
|------------|-------|--------|
| `Sidebar.svelte` | organism | ✅ implementado |
| `Notifications.svelte` | organism | ✅ implementado |

Demais pastas: vazias.

## Candidatos prioritários

### Atoms (esforço total ~3 dias)

| Componente | Usos | Variantes |
|------------|------|-----------|
| `Button.svelte` | 6+ | `primary`, `secondary`, `ghost`, `danger`, `loading` |
| `Input.svelte` | 8+ | type variations + slots para prefix/suffix |
| `Spinner.svelte` | 4+ | sizes `sm`, `md`, `lg` |
| `Badge.svelte` | 5+ | semantic `success`, `warning`, `error`, `info`, `neutral` |
| `Avatar.svelte` | 2-3 | placeholder até identicon real |

### Molecules (esforço total ~3 dias)

| Componente | Usos | Composição |
|------------|------|-----------|
| `FormField.svelte` | 6+ | `<label>` + `<Input>` + error message + helper text |
| `Card.svelte` | 5+ | snippets `header`, `body`, `footer` |
| `Alert.svelte` | 4+ | semantic variants + dismiss |
| `EmptyState.svelte` | 4+ | ícone + título + descrição + slot ação |
| `PageHeader.svelte` | 6+ | título + breadcrumbs (futuro) + slot ações |

### Organisms (esforço médio, prioridade baixa)

| Componente | Usos | Quando extrair |
|------------|------|-----------------|
| `ChatPanel.svelte` | 2 (RAG chat, Models chat) | Apenas após ambas estabilizarem (regra dos 3) |
| `JobList.svelte` | 1-2 | Quando dashboard mini-list e training full-list convergirem |
| `MemberList.svelte` | 1 | Já é único uso — não extrair |

### Templates (já existentes em `routes/+layout.svelte`)

Mover para `templates/` quando aparecer um segundo layout (ex: layout admin).

## Lógica candidata a `lib/utils/` (não-UI)

Funções puras detectadas como candidatas:

- `validators.ts` — validação de senha, email, formato de coleção RAG
- `formatters.ts` — bytes (`12.4 GB`), datas relativas (`há 3 minutos`), durações
- `truncate.ts` — texto com ellipsis
- `jwt.ts` — parse de claims (quando JWT real chegar)

> Manter `lib/utils/` apenas para funções **puras sem dependência**. Casos de uso vão em `lib/server/<modulo>/application/`.

## Anti-padrões a evitar

- **Componente "tudo-em-um"**: `<Card title="..." body="..." footer="..." actions="...">` com 8+ props. Preferir snippets.
- **Base class compartilhada** entre `Button` e `IconButton`: composição é melhor que herança aqui.
- **Service base abstrato** entre Web e Tauri (PROIBIDO em `.claude/rules/05-services-http.md`).
- **Helper genérico** com 2 callers — esperar 3.

## Process

1. Detectar duplicação em PR review (manualmente, sem ferramenta).
2. Documentar a 3ª ocorrência como motivo de extração.
3. Criar componente em `design-system/<nivel>/`.
4. Adicionar testes Vitest.
5. Migrar pages que tinham o markup.
