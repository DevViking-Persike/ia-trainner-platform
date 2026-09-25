# 10 — Guia de Onboarding

**Última atualização:** 2026-04-27

Bem-vindo ao IA Trainner Frontend (v2). Este guia te leva de zero a "rodando localmente" e dá os ponteiros para os primeiros 30 dias.

## Pré-requisitos

- **Node.js 20+** e **npm** (npm é o package manager oficial do projeto, conforme `tauri.conf.json`).
- **Rust** via `rustup` (apenas se for trabalhar em Tauri/desktop/mobile).
- **Xcode** (apenas iOS).
- **Android Studio** + Android SDK (apenas Android).
- Editor recomendado: **VS Code** com extensões `Svelte`, `rust-analyzer`, `Tauri`.

## Setup local

```bash
git clone https://github.com/DevViking-Persike/ia-trainner-microservico
cd ia-trainner-microservico
git submodule update --init --recursive
cd Frontend
npm install
```

## Rodando

```bash
# Web SSR (mais comum no dia a dia)
npm run dev          # http://localhost:1420

# Desktop (Tauri)
npm run tauri:dev

# Type-check
npm run check
```

> Para iOS/Android, ver `Frontend/CLAUDE.md` seção "Comandos".

## Mapa mental dos primeiros minutos

```
1. Abra Frontend/CLAUDE.md             — overview da stack e backends
2. Abra .claude/rules/01..08*.md       — regras vinculantes (~30 min de leitura)
3. Abra docs/architecture/frontend/02-architecture-map.md — entenda fronteiras
4. Rode npm run dev e clique pelas pages
5. Abra src/lib/server/auth/index.ts e siga o caminho:
     index.ts → application/authenticate-user.ts → domain/auth.repository.ts
                                                 → infrastructure/auth.mock.repository.ts
6. Abra src/routes/(auth)/login/+page.server.ts e veja a action
7. Abra src/lib/services/auth.service.ts e veja o factory isTauri()
```

## Como adicionar uma feature pequena

Exemplo: adicionar campo "área de pesquisa" no profile.

### Passo 1 — Domínio
- Adicionar `areaPesquisa: string` em `src/lib/types.ts` (interface `AuthUserInfo`).
- Adicionar campo em `domain/auth.types.ts`.

### Passo 2 — Repository
- Atualizar `auth.repository.ts` se método `updateProfile` for novo.
- Adicionar implementação em `auth.mock.repository.ts` (e futuro HTTP).

### Passo 3 — Caso de uso
- Criar `application/update-profile.ts` se for novo, ou adicionar a um existente.

### Passo 4 — Composition root
- Atualizar `src/lib/server/auth/index.ts` se houver use case novo.

### Passo 5 — Tauri (Rust)
- Adicionar `#[tauri::command] async fn update_profile(...)` em `src-tauri/src/commands.rs`.
- Atualizar `src-tauri/src/models.rs` se struct mudou.
- Adicionar entrada em `src/lib/tauri.ts` (`auth.updateProfile = ...`).

### Passo 6 — Service
- Adicionar método à interface `AuthService` em `src/lib/services/auth.service.ts`.
- Implementar em `WebAuthService` (geralmente stub) e `TauriAuthService`.

### Passo 7 — Página
- Atualizar `(app)/profile/+page.svelte` (input para o campo).
- Atualizar `+page.server.ts` (action) chamando o caso de uso.

### Passo 8 — Testes
- Vitest para o caso de uso (sucesso, erro, validação).
- Vitest/Testing Library para o componente se houver UI nova.

### Passo 9 — Doc
- Atualizar `08-risks-and-tech-debt.md` se algum risco mudou.
- Atualizar `00-overview.md` se a feature surface mudou.

## Onde achar o quê

| Pergunta | Onde |
|----------|------|
| "Como funciona auth?" | `04-runtime-flow.md` seção 1 e 2 |
| "Que tokens CSS posso usar?" | `src/app.css` (categoria no `05-design-system-analysis.md`) |
| "Posso importar de `$lib/server/...` aqui?" | `02-architecture-map.md` tabela "Regras de import" |
| "Como adicionar nova rota autenticada?" | `.claude/rules/07-rotas-navegacao.md` + `hooks.server.ts` |
| "Que migrações estão pendentes?" | `.claude/rules/08-migracoes-pendentes.md` |
| "Como rodar testes?" | (futuro) `npm test`. Stack ainda não instalada. |

## Glossário rápido

| Termo | Definição |
|-------|-----------|
| **Hexagonal** | Arquitetura com domain/application/infrastructure separados |
| **Composition root** | `index.ts` de cada módulo que monta dependências |
| **Service Layer** | `src/lib/services/` — fachada Dual-Mode com `isTauri()` |
| **Use case** | Função em `application/` com lógica de negócio |
| **Repository** | Interface em `domain/` + implementação em `infrastructure/` |
| **Adapter** | SvelteKit adapter (`auto` para SSR, `static` para Tauri SPA) |
| **Runes** | API reativa do Svelte 5 (`$state`, `$props`, `$derived`, `$effect`) |
| **Snippet** | Equivalente moderno do `<slot>` em Svelte 5 |
| **invoke** | Função do Tauri que chama comando Rust do front |
| **Tauri Store** | Plugin de armazenamento criptografado pelo OS |

## Checklist primeira semana

- [ ] Rodar `npm run dev` e navegar em todas as pages
- [ ] Rodar `npm run tauri:dev` (se trabalhará em desktop/mobile)
- [ ] Ler `.claude/rules/01-arquitetura-frontend.md` e `02-design-system.md`
- [ ] Fazer login com `teste@exemplo.com / Senha123!@#123` (mock)
- [ ] Abrir `src/routes/(app)/+page.server.ts` e seguir até o mock repo
- [ ] Identificar qual módulo hexagonal você vai tocar primeiro
- [ ] Rodar `npm run check` (type-check) e ver que passa
- [ ] Ler `docs/architecture/frontend/08-risks-and-tech-debt.md` para entender débitos atuais

## Quem perguntar

Solo dev. Use o `git log` e o histórico de PRs para contexto. ADRs em `docs/adrs/` registram decisões.

## Quando algo dá errado

| Sintoma | Provável causa |
|---------|---------------|
| `npm run dev` com erro de port em uso | Porta 1420 ocupada (matar processo ou mudar em `vite.config.js`) |
| `npm run tauri:dev` falha em macOS | Faltando Xcode CLI tools (`xcode-select --install`) |
| Type errors após mudança em `lib/server/...` | SvelteKit cacheia — rodar `npm run check` |
| Auth quebrada após login | Cookie `ia_trainner_session` corrompido — limpar cookies do `localhost:1420` |
| Tauri não persiste tema | Tauri Store em path inacessível — verificar logs (`stderr`) |
