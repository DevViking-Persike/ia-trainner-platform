# Auditoria e Limpeza Documental — v2

**Data:** 2026-04-27
**Escopo:** Refatoração de toda a documentação após migração de Blazor MVVM .NET → SvelteKit + Tauri.

## Contexto

A v2 do frontend (SvelteKit 2 + Svelte 5 + Tauri 2) substituiu integralmente o stack anterior baseado em Blazor Server + MAUI Blazor Hybrid + Razor Class Library compartilhada. Toda a documentação acumulada (CLAUDE.md, regras, ADRs, análises, arquitetura e reviews) descrevia o estado anterior e ficou obsoleta.

Este documento registra a auditoria/limpeza realizada nesta data.

## Arquivos refatorados

| Caminho | Antes | Depois |
|---------|-------|--------|
| `CLAUDE.md` | Blazor MVVM + MAUI + ImageDocker ARM64 | SvelteKit + Tauri Dual-Mode na raiz do `Frontend/` |
| `README.md` | Stack .NET + scripts dotnet | Stack SvelteKit/Tauri + comandos `npm run dev`, `tauri:dev`, etc. |
| `.claude/rules/01-arquitetura-frontend.md` | MVVM + ViewModels Razor | Hexagonal SSR + runes Svelte 5 |
| `.claude/rules/02-design-system.md` | Tokens CSS Blazor | Tokens em `app.css` + atomic design Svelte |
| `.claude/rules/03-reaproveitamento.md` | Componentes Razor | Snippets Svelte 5 + regra dos 3+ usos |
| `.claude/rules/04-testes.md` | xUnit + NSubstitute | Vitest + Testing Library + Playwright |
| `.claude/rules/05-services-http.md` | IHttpClientFactory + DelegatingHandler | Service Layer Dual-Mode + `isTauri()` |
| `.claude/rules/06-seguranca.md` | DI Singleton/Scoped Blazor | Cookie httpOnly + Tauri Store |
| `.claude/rules/07-rotas-navegacao.md` | PathBase Blazor `/ia-trainner` | Route groups SvelteKit `(app)` / `(auth)` |
| `.claude/rules/08-migracoes-pendentes.md` | 13 migrações Blazor concluídas | Pendências reais da v2 (mock → HTTP, JWT, testes, etc.) |
| `docs/adrs/ADR-0001` … `ADR-0006` | Decisões Blazor | Decisões SvelteKit + Tauri |
| `docs/analysis/frontend/01..07*.md` | Diagnóstico do código Blazor | Diagnóstico real do código v2 |
| `docs/analysis/frontend/improvement-plan.md` | Plano Blazor | Plano Hexagonal v2 |
| `docs/architecture/frontend/00..10*.md` | Arquitetura Blazor | Arquitetura SvelteKit + Tauri |
| `docs/review/*.md` | Reviews antigos do código Blazor | Reviews atuais do código v2 |

## Arquivos não-tocados

- `docs/adrs/ADR-TEMPLATE.md` — template genérico, sem conteúdo de stack.

## Princípio aplicado

Mantida a **estrutura de arquivos** e a numeração; reescrito o **conteúdo** com base em análise real do código v2. Nada foi inventado: o estado registrado reflete o que existe no commit atual da branch `dev`.

## Pontos de divergência conhecidos

- A documentação anterior referenciava recursos do Blazor (PathBase, MVVM, NavLink) que **não se aplicam** à v2.
- Reviews antigos (segurança, performance, testes) tinham achados específicos de Razor — substituídos por achados reais do código atual.
- ADR-0006 mudou de "Chat History via API" para "Auth via Cookie httpOnly + Tauri Store" — o tema original (chat history) é tangencial à arquitetura atual; a decisão de auth é central.

## Próxima auditoria

Recomendação: nova auditoria documental quando:
1. Mock repositories forem substituídos por HTTP repositories (substancial mudança em `infrastructure/`).
2. Stack de testes (Vitest + Playwright) for instalada e pelo menos um caso de uso testado.
3. Deploy SSR público da v2 substituir a versão Blazor antiga em `https://victorpersike.dev.br/ia-trainner/`.
