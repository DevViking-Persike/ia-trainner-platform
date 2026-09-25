# Shell e navegação do Angular

Origem: C-M2-SHELL, adaptado à sessão BFF ([ADR-0007](../../adrs/ADR-0007-sessao-bff-cookie.md)). Vale para `apps/frontend`. A navegação vem de `GET /api/platform`; nenhuma entrada ou contador é inventado.

## Rotas

Públicas do M1 (BFF): `/`, `/entrar`, `/cadastro`, `/verificar-email`, `/recuperar-senha`, `/recuperar-senha/nova`, `/acesso-negado` e `**`. Não existe `/auth/callback` no SPA.

```ts
{
  path: 'app',
  canActivate: [authGuard],
  loadComponent: () => import('./core/layout/app-shell').then((m) => m.AppShell),
  children: [
    { path: '', pathMatch: 'full', title: 'Painel · IA Trainner',
      loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage) },
    { path: 'perfil', title: 'Perfil · IA Trainner',
      loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage) },
    { path: 'documentos', title: 'Documentos · IA Trainner',
      loadComponent: () => import('./features/documents/documents-page').then((m) => m.DocumentsPage) },
    { path: 'documentos/:id', title: 'Documento · IA Trainner',
      loadComponent: () => import('./features/documents/document-detail-page').then((m) => m.DocumentDetailPage) },
  ],
}
```

- O `authGuard` pergunta a sessão ao BFF (`GET /api/auth/session`); sem sessão, vai a `/entrar?returnUrl=<rota privada>`. `returnUrl` só aceita `/app` e subrotas.
- Parâmetros: `/app/documentos?colecao={id}` filtra por coleção; `/app/documentos/:id?pagina=N` rola até a página N (usado pelas citações do M3).
- A `WorkspacePage` do M1 some: o painel passa ao índice (`DashboardPage`) e o contexto de `/api/me` a `/app/perfil`.
- M3 e M4 acrescentam filhas (`conversas`, `treinamentos`, `modelos`) quando suas APIs existirem.

## Navegação

`core/layout/nav-items.ts` mapeia as capacidades de `GET /api/platform` (`{"capabilities": [{"id", "status", "milestone"}]}`):

| Capacidade | Entradas |
|---|---|
| `access` | Painel → `/app` (correspondência exata) |
| `documents` | Documentos → `/app/documentos` |
| `conversations` | Conversas → `/app/conversas` |
| `training` | Treinamentos → `/app/treinamentos` e Modelos → `/app/modelos` |

- Capacidade `unavailable`: entrada desabilitada (`aria-disabled`, sem link) com "Indisponível · marco {milestone}". Id desconhecido é ignorado.
- Falha ao carregar as capacidades: só o Painel aparece, com aviso e "Tentar novamente".
- A capacidade controla navegação e cartões, não autorização: a rota abre por URL direta (usado no QA antes da liberação) e mostra "Módulo em validação · marco {milestone}" enquanto estiver `unavailable`. `documents` só vira `available` depois da verificação do M2 no ambiente.
- Área do usuário: nome da sessão (`AuthSession.displayName()`) com link para `/app/perfil` e "Sair", que chama `AuthSession.signOut()` (`POST /api/auth/logout`), mostra "Saindo…" e avisa em toast se falhar.
- Layout: sidebar a partir de 768 px (260 px, recolhível para 72 px) e gaveta abaixo disso, com botão de menu (`aria-expanded`, `aria-controls`), foco preso na gaveta aberta e Esc para fechar. Ícones em SVG inline com `aria-hidden="true"`, sem emoji e sem atributo `style`. Tema escuro, paleta e fonte atuais do M1, salvo decisão diferente do titular.

## Componentes compartilhados

Standalone, com signals, em `shared/ui`:

| Componente | Entradas |
|---|---|
| `PageHeader` | `title`, `subtitle?` |
| `StatCard` | `label`, `value: number \| null`, `state: 'ready' \| 'loading' \| 'unavailable'`, `note?` |
| `StatusBadge` | `variant: 'success' \| 'info' \| 'warning' \| 'error' \| 'neutral'`, `label` |
| `ProgressBar` | `value` (0 a 100), `label`, `variant?` |
| `EmptyState` | `title`, `text`, `actionLabel?`; saída `action` |
| `Notice` | `kind: 'info' \| 'error'`, `retry?`; saída `retried` |
| `Skeleton` | `lines?` |
| `ConfirmDialog` | `title`, `body`, `confirmLabel`, `danger?`; saídas `confirmed` e `cancelled` |

`core/ui/notification.service.ts`: `success`, `error`, `info` e `warning(message)` devolvem um id; `remove(id)`; `clear()`. Durações: 5000 ms (sucesso e info), 6000 ms (aviso), 8000 ms (erro), pausadas com o ponteiro ou o foco sobre o toast. `ToastOutlet` é montado uma vez: contêiner `aria-live="polite"`, `role="alert"` só em erros e `role="status"` nos demais, botão "Fechar notificação". Toast nunca substitui o erro na página com "Tentar novamente".

## Padrão das páginas

- Estado da página: `'loading' | 'ready' | 'error' | 'redirecting'`.
- 401: o interceptor chama `AuthSession.rejectedByApi` (estado `redirecting`). 403 `auth.forbidden`: `/acesso-negado`. 403 `{"error":"csrf"}`: aviso para recarregar. Demais erros: `Notice` com a mensagem do código ([erros](erros.md)) e "Tentar novamente".
- O interceptor envia `X-IAT-Request: 1` em toda chamada relativa a `/api/`, nunca a URLs absolutas; não há cabeçalho `Authorization` nem token no navegador.
- Adaptadores HTTP por feature (`features/documents/documents-api.ts`, `collections-api.ts`, `consents-api.ts`) com URLs relativas.

## Páginas do M2

| Rota | Conteúdo |
|---|---|
| `/app` | cartões Documentos, Prontos, Em processamento, Com falha e Coleções de `GET /api/documents/summary` quando `documents` estiver disponível; senão "Indisponível · marco M2"; falha do resumo mostra "indisponível", nunca 0 |
| `/app/perfil` | nome da sessão; de `/api/me`: identificador, organização, funções e expiração da sessão (em `America/Sao_Paulo`); consentimento do Gemini com aceite e revogação ([consentimento-gemini](consentimento-gemini.md)); link "Redefinir senha" para `/recuperar-senha`; Sair. Sem link para console do ZITADEL, plano, créditos ou estatísticas |
| `/app/documentos` | coleções (criar, filtrar, excluir com contagem), aviso de consentimento antes do envio, área de envio com progresso por arquivo, lista com rótulos de estado e consulta periódica ([api-documentos](api-documentos.md)) |
| `/app/documentos/:id` | metadados, passos, páginas (texto sob demanda), erro com "Tentar novamente" quando `retryable`, download, exclusão com confirmação; id de outro dono mostra "Documento não encontrado" |
