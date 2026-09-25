# Review de Performance — IA Trainner v2

**Data:** 2026-04-27
**Escopo:** Performance de SvelteKit SSR e Tauri SPA na configuração atual (todos os repos mock).

## Contexto

Revisão prematura — não há backend real ainda, então medir tempos de query/upload é sem sentido. Foco aqui: **arquitetura** que vai sustentar performance quando os HTTP repos chegarem.

## Avaliação por dimensão

### Bundle size

- **Svelte 5** produz bundles muito pequenos (sem virtual DOM legado).
- **SvelteKit code-splitting** automático por rota.
- **Vite tree-shaking** elimina código morto.
- **Tauri** entrega bundle menor que MAUI/Electron — esperado ~10-30 MB final.

**Sem números reais ainda** — medir após Fase B com `npm run build` + análise via `vite-bundle-visualizer`.

### Cold start

- **Web SSR**: ~50-100ms para páginas com mock repos. Com HTTP real, depende do backend.
- **Tauri (desktop)**: WebView nativo + Rust shell, ~500-1000ms para abrir janela.
- **Tauri (mobile)**: típico de WebView mobile, similar a app PWA.

### Renderização

- **Svelte 5 runes** otimiza reatividade fine-grained — só atualiza o DOM dos elementos que dependem de cada `$state`.
- **CSS scoped** evita re-cálculo desnecessário em mudança de tema (apenas re-aplica variáveis).

### Rede

- **Web SSR**: response single-pass (HTML + dados pré-carregados em `+page.server.ts`).
- **Tauri**: IPC ~1-5ms (overhead trivial); HTTP fica direto no shell Rust com `reqwest` (não passa por WebView).

### Lazy loading

- Páginas SvelteKit já são lazy por rota.
- Componentes podem ser dynamic imports (`await import('...')` em `<script>`).
- `lib/tauri.ts` é lazy-importado em services (`(await import('$lib/tauri'))`)— evita carregamento em Web.

## Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Promise.all em listas grandes** | Média | Stress no backend | Em `(app)/teams/+page.server.ts` há `Promise.all` para membros. Se N teams > 50, paginar. |
| **N+1 hidden em RAG** | Média | UX lenta | Quando `rag.http.repository.ts` chegar, garantir batch endpoint ou paralelismo. |
| **Imagens não otimizadas** | Baixa | Bundle/UX | Não há imagens hoje; ao adicionar, usar `srcset` + lazy. |
| **Bundle Tauri grande no mobile** | Baixa | Storage | Verificar com `tauri info` após primeiro build. |
| **Re-render excessivo de Sidebar em theme toggle** | Baixa | Jank | Theme via atributo HTML — não dispara re-render Svelte. ✅ |
| **Streaming de query RAG não implementado** | Média | UX percebida | Quando `rag.http.repository.ts` chegar, considerar SSE ou ReadableStream. |

## Pontos positivos

- **Tema dark/light** instantâneo (CSS variables — nenhum re-render).
- **Stores writable** com `subscribe` granular.
- **SvelteKit prefetch** ativável via `data-sveltekit-preload-*` (não usado ainda, mas trivial adicionar).
- **`use:enhance`** em forms evita full reload, mantendo SPA-feel mesmo em SSR.

## Recomendações

### Curto prazo (junto com Fase A/B)
1. Após primeiro `*.http.repository.ts`, medir tempos de SSR com `console.time` e `Server-Timing` header.
2. Habilitar `data-sveltekit-preload-data="hover"` em links principais.
3. Quando RAG conectar real, implementar streaming ou ao menos progress.

### Médio prazo
4. Auditar bundle com `vite-bundle-visualizer`.
5. Investigar split de `lib/tauri.ts` — hoje é um arquivo único; pode crescer.
6. Considerar `Cache-Control` em SSR para dados que mudam pouco (lista de modelos Ollama).

### Longo prazo
7. Telemetria web (FCP, LCP, CLS, INP) via Web Vitals + endpoint próprio ou Sentry.
8. Lighthouse CI no workflow para detectar regressão de performance.

## Conclusão

Sem números reais para reportar — é uma **avaliação de potencial**. Arquitetura é favorável: Svelte 5 + Vite + Tauri são todos otimizados para bundles pequenos e cold start rápido. Risco de performance é **baixo** desde que a Fase B respeite as recomendações de paralelização e batch endpoints.

Rodar este review novamente após Fase B com números reais.
