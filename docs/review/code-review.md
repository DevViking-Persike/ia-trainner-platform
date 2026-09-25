# Code Review — IA Trainner v2 (SvelteKit + Tauri)

**Data:** 2026-04-27
**Revisor:** Claude (automated review)
**Escopo:** Branch `dev` do submodule `Frontend` após migração Blazor → SvelteKit/Tauri.

## Resumo

Projeto **arquiteturalmente sólido**, com Hexagonal por módulo e Dual-Mode bem aplicados. Defeitos detectados são todos de **dívida funcional reconhecida** (mocks em vez de HTTP real) e não estruturais. Documentação acompanha o código.

## Resultado consolidado

| Dimensão | Nota | Comentário |
|----------|------|-----------|
| Arquitetura | 🟢 Forte | Hexagonal + Dual-Mode aderentes às regras |
| Estilo de código | 🟢 OK | Svelte 5 runes adotado, TypeScript strict |
| Testes | 🔴 Ausente | Zero testes — bloqueador para produção |
| Segurança | 🟡 Médio | Cookie não-JWT; CSP nulo; secure flag ausente |
| Documentação | 🟢 Excelente | CLAUDE.md, rules, ADRs e architecture docs sincronizados |
| Performance | 🟢 OK em mock | A medir após HTTP repos |
| Acessibilidade | 🟡 Parcial | Estrutura OK; auditoria a11y pendente |

## Achados detalhados

### A1. Zero testes (bloqueador para produção)
**Local**: repositório inteiro.
**Severidade**: 🔴 alta para produção; 🟢 aceitável em MVP transição.
**Recomendação**: instalar Vitest + Testing Library + Playwright na próxima sprint (ver `09-recommended-evolution.md` Fase A).

### A2. Repositories são mocks
**Local**: `src/lib/server/<modulo>/infrastructure/<modulo>.mock.repository.ts` (6 módulos).
**Severidade**: 🔴.
**Justificativa documentada**: `08-migracoes-pendentes.md` item 1.

### A3. Auth é cookie base64, não JWT
**Local**: `(auth)/login/+page.server.ts:26`, `hooks.server.ts:13`.
**Severidade**: 🔴.
**Mitigação**: substituir junto com `auth.http.repository.ts`.

### A4. Cookie de sessão sem `secure: true`
**Local**: `(auth)/login/+page.server.ts:26-31` e `(auth)/cadastro/+page.server.ts` (provável).
**Severidade**: 🟡.
**Fix sugerido**:
```ts
secure: process.env.NODE_ENV === 'production'
```

### A5. Guard de auth incompleto
**Local**: `hooks.server.ts:30`.
**Severidade**: 🟡.
**Recomendação**: incluir `/profile` e `/teams`, ou mover guard para `(app)/+layout.server.ts`.

### A6. Comandos Rust mock
**Local**: `src-tauri/src/commands.rs`.
**Severidade**: 🟡.
**Recomendação**: refatorar para `reqwest` apontando aos mesmos backends usados pelos HTTP repos TS.

### A7. Console.error em UI
**Local**: `(app)/models/+page.svelte:14`.
**Severidade**: 🟢.
**Recomendação**: substituir por logging estruturado quando disponível.

### A8. Profile sem backend
**Local**: `(app)/profile/+page.svelte` (comentário "for now").
**Severidade**: 🟡.
**Recomendação**: implementar endpoint `PATCH /api/auth/account` no Lambda ou desabilitar input com mensagem clara.

### A9. CSP nulo no Tauri
**Local**: `tauri.conf.json:24`.
**Severidade**: 🟡 (deploy).
**Recomendação**: definir CSP estrito antes do release público.

### A10. iOS Apple Team hardcoded
**Local**: `tauri.conf.json:39`.
**Severidade**: 🟢.
**Recomendação**: mover para env var via build script.

### A11. Stores ainda em `writable()` (não runes)
**Local**: `src/lib/stores/{auth,theme,notifications}.ts`.
**Severidade**: 🟢.
**Recomendação**: aguardar consenso da comunidade Svelte 5 antes de migrar.

### A12. Sem CI/CD
**Local**: `.github/workflows/`.
**Severidade**: 🟡.
**Recomendação**: workflow mínimo `npm run check && npm run test:run` em PRs.

## Pontos positivos a destacar

- **Hexagonal puro** sem violação de imports.
- **Service Layer Dual-Mode** funciona como desenhado.
- **Composition root manual** em cada módulo é simples e auditável.
- **Tipos compartilhados** entre TS (`src/lib/types.ts`) e Rust (`src-tauri/src/models.rs`) bem espelhados.
- **`hooks.server.ts`** é enxuto e claro.
- **Tema dark/light** funcional via CSS variables + atributo HTML.
- **Documentação sincronizada com código** após esta refatoração.

## Itens em aberto para próximo review

- Reavaliar após instalação da stack de testes.
- Reavaliar após primeiro `*.http.repository.ts`.
- Auditoria a11y após criação dos atoms/molecules do DS.

## Conclusão

**Aprovado** para continuar evolução. **Não aprovado para produção** até R1, R2, R3, R4 do `08-risks-and-tech-debt.md` serem resolvidos.

Próximo review recomendado: após Fase A (fundação) ou Fase B (HTTP repos) do roadmap em `09-recommended-evolution.md`.
