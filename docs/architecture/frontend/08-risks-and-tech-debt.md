# 08 — Riscos e Dívida Técnica

**Última atualização:** 2026-04-27

## Categorização

🔴 Alta — bloqueia produção
🟡 Média — degrada experiência ou postura de segurança
🟢 Baixa — cosmético / melhoria

## Riscos identificados

### 🔴 Alta severidade

#### R1. Todos os repositories são MOCK
**Onde**: `src/lib/server/<modulo>/infrastructure/<modulo>.mock.repository.ts` (6/6 módulos).
**Impacto**: Nenhum dado real. Login com credenciais hardcoded (`teste@exemplo.com / Senha123!@#123`). Jobs, coleções, modelos, teams: tudo dummy.
**Mitigação**: Implementar `<modulo>.http.repository.ts` chamando os microsserviços reais. Trocar referência em `index.ts` (composition root).
**Esforço estimado**: 8-12 dias para 6 módulos com testes.

#### R2. Auth não é JWT real
**Onde**: `(auth)/login/+page.server.ts:26`, `hooks.server.ts:13`.
**Impacto**: Cookie é `btoa(JSON.stringify({ user, exp }))` — qualquer pessoa pode forjar uma sessão se conseguir setar o cookie.
**Mitigação**: Migrar para JWT real do Keycloak. Validar assinatura em `hooks.server.ts` chamando `authDependencies.repository.verifySession(token)`.
**Esforço**: 1-2 dias junto da implementação de R1.

### 🟡 Média severidade

#### R3. Sem testes
**Onde**: ausência total.
**Impacto**: Regressão silenciosa em qualquer mudança em casos de uso ou repositories.
**Mitigação**: Instalar Vitest + Testing Library + Playwright; meta de 80% de cobertura em `application/` antes de deploy público.

#### R4. Sem CI/CD
**Onde**: `.github/workflows/` ausente.
**Impacto**: PRs entram sem validação automática. Builds quebrados podem chegar a `main`.
**Mitigação**: Workflow mínimo `npm run check && npm run test:run` em PRs.

#### R5. Cookie de sessão sem `secure: true`
**Onde**: `(auth)/login/+page.server.ts:26`.
**Impacto**: Em produção HTTPS, cookies devem ter `secure: true`. Hoje é falso/ausente.
**Mitigação**:
```ts
secure: process.env.NODE_ENV === 'production'
```

#### R6. Guard de auth incompleto
**Onde**: `hooks.server.ts:30`.
**Impacto**: Apenas `/training`, `/rag`, `/server`, `/models` são guardadas. `/profile` e `/teams` não. Embora no grupo `(app)`, request HTTP direta passa pela auth?
**Mitigação**: Adicionar prefixos `/profile` e `/teams` ao regex de guard, ou mover guard para `(app)/+layout.server.ts`.

#### R7. CSP nulo no Tauri
**Onde**: `tauri.conf.json:24` (`"csp": null`).
**Impacto**: Sem Content Security Policy. Para um app que executa código Rust de confiança, é aceitável durante MVP, mas ideal definir CSP estrito antes de release.

#### R8. iOS Apple Team hardcoded
**Onde**: `tauri.conf.json:39` (`developmentTeam: L9ZD989PDG`).
**Impacto**: Identificador Apple commitado. Não é segredo (é público em apps publicados), mas idealmente vai por env var.

#### R9. Console.error em UI
**Onde**: `(app)/models/+page.svelte:14` ("Erro ao carregar modelos via Tauri").
**Impacto**: Logs em produção. Aceitável em dev, ruim em prod.
**Mitigação**: Substituir por sistema de logging estruturado (futuro Sentry ou OTEL browser).

#### R10. Profile sem backend
**Onde**: `(app)/profile/+page.svelte`.
**Impacto**: Comentário "Profile save is local-only for now (no backend endpoint)" — UX engana o usuário se ele acreditar que salvou.
**Mitigação**: Implementar endpoint no Lambda Keycloak (`PATCH /api/auth/account`) ou indicar claramente "salvar não funciona ainda".

#### R11. Comandos Rust mock
**Onde**: `src-tauri/src/commands.rs`.
**Impacto**: Tauri retorna dados dummy. Comportamento Web (mock) e Tauri (mock) divergem do que será com HTTP real.
**Mitigação**: Refatorar comandos para usar `reqwest` chamando os mesmos backends. Pode ser feito em paralelo aos HTTP repositories TS.

### 🟢 Baixa severidade

#### R12. Sem tokens tipográficos (font sizes)
**Mitigação**: Adicionar `--font-size-*` em `app.css`.

#### R13. Atoms / molecules / templates do DS vazios
**Mitigação**: Extrair conforme regra dos 3+ usos (ver `06-component-reuse-map.md`).

#### R14. Sem suporte offline (Tauri)
**Mitigação**: Avaliar service worker / cache em Tauri Store apenas se virar dor real.

#### R15. Sem i18n
**Mitigação**: Não-bloqueador. App é PT-BR único.

#### R16. Stores usam `writable()` clássico, não runes
**Onde**: `src/lib/stores/{auth,theme,notifications}.ts`.
**Impacto**: Mistura de padrões (runes nos componentes, writable nos stores). Funciona corretamente mas é inconsistente.
**Mitigação**: Aguardar consenso da comunidade Svelte 5 sobre runes em stores antes de migrar.

#### R17. Logging Rust sem `log::*` macros
**Onde**: `src-tauri/src/commands.rs`.
**Impacto**: `env_logger` listado em Cargo.toml mas não usado. Diagnóstico difícil em mobile.
**Mitigação**: Adicionar `log::info!` / `log::error!` nos pontos críticos.

## Tabela consolidada

| ID | Severidade | Tema | Esforço |
|----|-----------|------|---------|
| R1 | 🔴 | Mocks → HTTP repositories | 8-12d |
| R2 | 🔴 | Auth JWT real | 1-2d |
| R3 | 🟡 | Stack de testes | 1d setup + ongoing |
| R4 | 🟡 | CI mínimo | 0.5d |
| R5 | 🟡 | Cookie `secure: true` | 0.1d |
| R6 | 🟡 | Guard auth completo | 0.25d |
| R7 | 🟡 | CSP estrita | 0.5d (deploy) |
| R8 | 🟡 | iOS team via env var | 0.25d |
| R9 | 🟡 | Logging estruturado | 1d |
| R10 | 🟡 | Profile com backend | 1-2d |
| R11 | 🟡 | Comandos Rust com HTTP real | 5-7d |
| R12 | 🟢 | Tokens tipográficos | 0.25d |
| R13 | 🟢 | Atoms/molecules/templates | 5-7d |
| R14 | 🟢 | Offline | n/a |
| R15 | 🟢 | i18n | n/a |
| R16 | 🟢 | Runes em stores | aguardar |
| R17 | 🟢 | log::* em Rust | 0.5d |

## Risco geral

**Funcional**: 🔴 alto — app não conecta a nada real.
**Estrutural**: 🟢 baixo — Hexagonal + Dual-Mode bem aplicados.
**Segurança**: 🟡 médio — auth não-JWT é o ponto mais sensível.
**Manutenibilidade**: 🟢 boa — código limpo, runes, separação clara.

## Próximos passos

Ordem recomendada:
1. R5, R6, R8, R12, R17 (quick wins, ~1 dia total)
2. R3 + R4 (setup de testes e CI, ~1 dia)
3. R1 + R2 (mocks → HTTP + JWT real)
4. R10, R11 (Profile + comandos Rust HTTP)
5. R13 (DS extraction)
6. R7, R9 (deploy hardening)
