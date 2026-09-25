# Review de Segurança — IA Trainner v2

**Data:** 2026-04-27
**Escopo:** SvelteKit SSR + Tauri 2 SPA + comandos Rust + cookie auth.

## Resultado: 🟡 Médio risco

Estrutura está correta (Hexagonal isolando server-side, cookie httpOnly em vez de localStorage, frontend não acessa banco direto). Os riscos altos são todos **dívida planejada** com migração documentada.

## Achados

### S1. Cookie de sessão é base64, não JWT 🔴
**Local**: `(auth)/login/+page.server.ts:26`, `hooks.server.ts:13`.
**Detalhe**:
```ts
cookies.set('ia_trainner_session', btoa(JSON.stringify({ user, exp })), { ... })
```
**Risco**: qualquer ator com capacidade de setar cookie no domínio pode forjar sessão (não há assinatura).
**Mitigação imediata**: documentado como item 2 de `08-migracoes-pendentes.md`. Substituir junto com `auth.http.repository.ts`.
**Mitigação adicional**: até lá, restringir `Domain` do cookie ao mínimo possível e considerar `__Host-` prefix.

### S2. Cookie sem `secure: true` em produção 🟡
**Local**: idem S1.
**Risco**: em HTTPS, cookie pode ser exposto em downgrade.
**Fix imediato**:
```ts
secure: process.env.NODE_ENV === 'production'
```

### S3. Guard de auth incompleto 🟡
**Local**: `hooks.server.ts:30`.
**Detalhe**: regex cobre `/training`, `/rag`, `/server`, `/models`. Não cobre `/profile`, `/teams`.
**Risco**: request HTTP direta para `/profile` ou `/teams` sem session pode renderizar (depende de `+page.server.ts` checar `locals.session`).
**Fix**: adicionar prefixos OU mover guard para `(app)/+layout.server.ts`.

### S4. CSP nulo em Tauri 🟡
**Local**: `tauri.conf.json:24` (`"csp": null`).
**Risco**: nenhuma restrição de content origins. Aceitável em MVP, ruim em release.
**Fix**: definir CSP estrita restringindo a origens necessárias antes do release público.

### S5. Apple Team ID hardcoded 🟢
**Local**: `tauri.conf.json:39` (`developmentTeam: L9ZD989PDG`).
**Risco**: identificador público em apps Apple — informação não é secreta. Estética/limpeza apenas.
**Fix**: extrair via env var em build script.

### S6. Credenciais hardcoded em mock 🟢
**Local**: `auth.mock.repository.ts`, `commands.rs login()`.
**Detalhe**: aceita `teste@exemplo.com / Senha123!@#123`.
**Risco**: aceitável em mock; risco real só se entrar produção.
**Fix**: garantir que `auth.mock.repository.ts` seja **explicitamente proibido** em produção via env check.

### S7. `csp: null` aplicada aos comandos Rust 🟢
**Detalhe**: além do CSP do WebView, comandos Rust não usam permissões fine-grained de `tauri-plugin-fs` ou `network` — confiam no default.
**Fix**: definir `capabilities/main.json` com escopo explícito (network: apenas backends conhecidos; fs: nada).

### S8. Logs em UI 🟢
**Local**: `console.error('Erro ao carregar modelos via Tauri')` em `(app)/models/+page.svelte:14`.
**Risco**: vazamento mínimo de info em prod. Aceitável agora.
**Fix**: substituir por logging estruturado.

## O que está bom

- ✅ Cookie é `httpOnly` (imune a XSS).
- ✅ `sameSite: 'lax'` (não enviado em cross-site POST).
- ✅ Sem `localStorage` para tokens.
- ✅ Sem `sessionStorage` para credenciais.
- ✅ Frontend não conecta direto em DB.
- ✅ Tokens Tauri vivem em `tauri-plugin-store` (criptografia OS).
- ✅ HTTP sempre via repository do server (Web) ou Rust (Tauri) — sem fetch espalhado em `.svelte`.
- ✅ Variáveis sensíveis usam `$env/dynamic/private`.
- ✅ Validação de senha (12+ caracteres, maiúscula, minúscula, número) no domain layer.
- ✅ Email obrigatório verificado antes de login.
- ✅ Multi-tenancy via claim `sub` do JWT — quando JWT chegar.

## Recomendações priorizadas

1. **S2** (cookie `secure: true`) — 5 minutos.
2. **S3** (guard completo) — 15 minutos.
3. **S5** (Apple Team via env) — 30 minutos (build script).
4. **S1** (JWT real) — junto da Fase B do roadmap.
5. **S4** (CSP estrita) — antes de Fase F (deploy público).
6. **S7** (capabilities Tauri) — antes de release mobile.

## Postura geral

A v2 **respeita boas práticas estruturais** (httpOnly, sem token client, sem DB direto). Os achados são todos endereçáveis em horas/dias, não semanas. Nenhum vetor de ataque crítico aberto além da ausência de validação JWT — que é um problema porque o cookie atual permite forge trivial.

**Aprovado para desenvolvimento; não aprovado para produção até S1, S2, S3, S4 resolvidos.**
