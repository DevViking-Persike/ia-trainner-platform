# fe-implement-feature

Como implementar uma feature respeitando a arquitetura MVVM, Design System e padroes do projeto.

## Quando usar

- Apos a analise da feature (ver `/fe-analyze-feature`).
- Quando o escopo, arquivos e decisoes ja estao claros.
- Para qualquer nova feature ou modificacao significativa no frontend.

## Pre-condicoes

- Ter executado `/fe-analyze-feature` e documentado decisoes.
- Conhecer a direcao de dependencia: Page -> ViewModel -> Service (interface) -> Backend. Ref: `.claude/rules/01-arquitetura-frontend.md`.
- Conhecer os tokens CSS disponiveis em `app.css`. Ref: `.claude/rules/02-design-system.md`.

## Passos

1. **Criar/atualizar Models (se necessario):**
   - Local: `IATrainner.Shared/Models/{Dominio}/`.
   - Models sao DTOs simples com propriedades publicas.
   - Propriedades computadas sao permitidas (ex: `EmAndamento`, `DuracaoFormatada`).
   - NUNCA usar `DateTime.Now` em logica testavel — usar `TimeProvider`. Ref: `.claude/rules/04-testes.md`.
   - NUNCA definir Models dentro de arquivos de interface ou service. Ref: `.claude/rules/01-arquitetura-frontend.md`.

2. **Criar/atualizar interface de Service (se necessario):**
   - Local: `IATrainner.Shared/Services/{Dominio}/I{Nome}Service.cs`.
   - Metodos async retornando `Task<T>`.
   - Verificar se a interface existente ja cobre a necessidade antes de criar nova.
   - Se a interface existente tiver >12 metodos cobrindo dominios distintos, considerar segregacao. Ref: P5.

3. **Implementar Service em AMBAS plataformas:**
   - Web: `IATrainner.Web/Services/{Dominio}/{Nome}Service.cs`.
     - Usar `IHttpClientFactory` com named client.
     - Mapeamento API -> Model dentro do service (records privados para API responses).
     - NAO duplicar `SetAuthAsync()` — usar o padrao existente ate migrar para `DelegatingHandler`. Ref: `.claude/rules/05-services-http.md`.
     - Tratar: sucesso, 401 (token expirado), erro de rede, erro generico. Ref: `.claude/rules/05-services-http.md`.
   - MAUI: `IATrainner/Services/{Dominio}/{Nome}Service.cs`.
     - Seguir mesmo contrato da interface.
   - Registrar no DI de AMBAS plataformas (`Program.cs` e `MauiProgram.cs`).
   - Services com estado de usuario: usar `AddScoped`, nao `AddSingleton`. Ref: `.claude/rules/06-seguranca.md`.

4. **Criar ViewModel (se a Page tera >30 linhas de @code):**
   - Local: `IATrainner.Shared/ViewModels/{Nome}ViewModel.cs`.
   - Herdar de `ViewModelBase` — que fornece `SetProperty`, `Carregando`, `MensagemErro`, `MensagemSucesso`.
   - Receber services por construtor (injecao por interface).
   - Incluir construtor vazio para designer/preview com early return em metodos quando service e null.
   - Metodo `CarregarAsync()` como entry point.
   - UM ViewModel por Page com logica significativa. NUNCA um ViewModel para duas Pages com responsabilidades distintas. Ref: `.claude/rules/01-arquitetura-frontend.md` e P4.
   - Escrever pelo menos 3 testes unitarios (sucesso, erro, validacao). Ref: `.claude/rules/04-testes.md`.

5. **Criar/atualizar Page:**
   - Local: `IATrainner.Shared/Pages/{Dominio}/{Nome}.razor`.
   - Definir `@page "/rota"` (rota relativa, sem `/ia-trainner`).
   - Page e responsavel APENAS por: markup, binding com ViewModel, event handlers simples.
   - NAO chamar services diretamente quando existir ViewModel. Ref: `.claude/rules/01-arquitetura-frontend.md`.
   - Usar `@inject` para services e `NavigationManager`.
   - Instanciar ViewModel em `OnInitialized` com services injetados.
   - Chamar `ViewModel.CarregarAsync()` em `OnInitializedAsync`.

6. **Aplicar Design System:**
   - Usar tokens CSS para cores (`--color-*`, `--bg-*`, `--text-*`), radius (`--radius-*`), sombras (`--shadow-*`). Ref: `.claude/rules/02-design-system.md`.
   - Usar componentes reutilizaveis de `Components/` para: loading spinner, alerts, empty state, page header.
   - Usar classes CSS existentes (`btn-primary`, `card`, `badge`, `form-group`, `data-table`, etc.).
   - Inline styles APENAS para valores dinamicos calculados em runtime. NUNCA para cores, fontes, bordas estaticas. Ref: `.claude/rules/02-design-system.md`.
   - Definir cores para ambos os temas (dark e light).
   - Elementos interativos com `:focus-visible`. Ref: `.claude/rules/02-design-system.md`.
   - Botoes icon-only com `aria-label`. Labels com `for`/`id`.

7. **Verificar rotas:**
   - `<a href>` e `<NavLink href>` -> relativo sem `/`: `href="training"`. Ref: CLAUDE.md.
   - `NavigateTo` -> usar `Navigation.BaseUri`: `Navigation.NavigateTo($"{Navigation.BaseUri}rota")`. Ref: CLAUDE.md.
   - NUNCA path absoluto com `/` — vai para raiz do dominio, nao do app.

8. **Testar manualmente:**
   - Executar `./run.sh web` e navegar ate a feature.
   - Verificar dark e light theme.
   - Verificar responsividade (>768px e <768px).
   - Verificar fluxo completo (criar, editar, deletar, erro, loading).

## Cuidados

- Evitar N+1: se precisa buscar lista + detalhe, usar `Task.WhenAll` para paralelizar. Ref: `.claude/rules/05-services-http.md` e P2.
- NAO modificar `DefaultRequestHeaders` por request — nao e thread-safe. Ref: `.claude/rules/05-services-http.md`.
- Manter consistencia com o padrao MVVM existente — todos os ViewModels seguem a mesma estrutura.
- Verificar que o CSS nao referencia variaveis inexistentes. Usar os aliases corretos documentados em `.claude/rules/02-design-system.md`.

## Anti-padroes

- Colocar logica de negocio/orquestracao diretamente na Page quando existe ViewModel.
- Criar ViewModel que serve duas Pages com responsabilidades distintas.
- Duplicar markup que ja existe como componente reutilizavel (loading, alerts, empty state).
- Usar cores hex hardcoded em markup ou inline styles.
- Criar inline styles para propriedades estaticas (cor, fonte, borda, radius).
- Registrar service com estado de usuario como Singleton.
- Hardcodar URLs de backend no codigo.
- Criar service apenas para Web sem implementar no MAUI.
- Copiar SVG icons inline — devem ser componentes em `Components/Atoms/`.

## Checklist de qualidade

- [ ] Models vivem em `Models/{Dominio}/`, nao dentro de interfaces ou services.
- [ ] Interface de service vive em `Shared/Services/{Dominio}/`.
- [ ] Service implementado em AMBAS plataformas (Web + MAUI).
- [ ] Service registrado no DI de ambas plataformas com lifecycle correto (Scoped vs Singleton).
- [ ] ViewModel herda de `ViewModelBase` e segue o padrao existente.
- [ ] ViewModel tem pelo menos 3 testes unitarios.
- [ ] Page nao tem >30 linhas de @code sem ViewModel.
- [ ] Page nao chama services diretamente (usa ViewModel).
- [ ] Todas as cores usam tokens CSS (sem hex hardcoded).
- [ ] Sem inline styles para propriedades estaticas.
- [ ] Rotas usam paths relativos (sem `/` absoluto).
- [ ] Elementos interativos tem `:focus-visible`, `aria-label` (icon buttons), `for`/`id` (labels).
- [ ] Dark e light theme funcionam corretamente.
- [ ] Feature funciona no breakpoint mobile (<768px).
