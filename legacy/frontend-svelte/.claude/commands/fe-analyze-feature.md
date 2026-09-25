# fe-analyze-feature

Analisa uma feature antes de implementar, verificando impacto arquitetural, reaproveitamento e pre-condicoes.

## Quando usar

- Antes de iniciar qualquer nova feature ou modificacao significativa no frontend.
- Quando receber um requisito novo e precisar entender onde e como encaixa na arquitetura existente.
- Antes de estimar esforco de implementacao.

## Pre-condicoes

- Ler arquivos em `.claude/rules/` para entender regras vigentes do projeto.
- Ler `CLAUDE.md` para contexto geral (arquitetura, backends, deploy).
- Identificar qual dominio a feature pertence (Auth, Training, RAG, Teams, Models, Profile).

## Passos

1. **Mapear escopo da feature:**
   - Quais telas sao afetadas? Listar Pages envolvidas.
   - Quais dados sao necessarios? Listar Models e endpoints de backend.
   - Qual fluxo de usuario? Descrever o caminho do usuario passo a passo.

2. **Verificar o que ja existe:**
   - Buscar em `IATrainner.Shared/Pages/` se ja existe page similar ou relacionada.
   - Buscar em `IATrainner.Shared/ViewModels/` se algum ViewModel existente cobre parte da logica.
   - Buscar em `IATrainner.Shared/Models/` se os DTOs necessarios ja existem.
   - Buscar em `IATrainner.Shared/Services/` se a interface de service ja expoe os metodos necessarios.
   - Buscar em `IATrainner.Shared/Components/` se existem componentes reutilizaveis aplicaveis.
   - Buscar em `IATrainner.Shared/wwwroot/css/app.css` se existem classes CSS para os padroes visuais da feature.

3. **Avaliar impacto arquitetural:**
   - A feature precisa de novo endpoint no backend? Qual service?
   - A feature precisa de novo Model? Onde vive (`Models/{Dominio}/`)?
   - A feature precisa de novo ViewModel? Ou pode estender um existente sem violar responsabilidade unica?
   - A feature precisa de nova interface de service? Ou pode estender a existente?
   - Se estender interface existente: tem mais de 12 metodos? Sinal de God Interface (ref: P5 no diagnostico — ITrainingService com 5 dominios).

4. **Avaliar impacto cross-platform:**
   - Se novo service: precisara de implementacao em AMBAS plataformas (Web + MAUI). Ref: `.claude/rules/01-arquitetura-frontend.md`.
   - Se novo HttpClient: registrar no DI de ambas plataformas com `IHttpClientFactory`.
   - Se usar `IChatHistoryService` ou service exclusivo do Web: verificar impacto no MAUI.

5. **Verificar impacto no Design System:**
   - Os padroes visuais da feature usam tokens CSS existentes (`--color-*`, `--bg-*`, `--radius-*`)?
   - Precisa de novos componentes? Ou os padroes existentes (loading, alerts, empty state, page header) cobrem?
   - A UI sera consistente com o dark/light theme? Definir cores para ambos os temas.

6. **Documentar decisao:**
   - Resumir em 3-5 linhas: o que sera criado, o que sera reutilizado, o que sera modificado.
   - Listar arquivos a serem criados/modificados.

## Cuidados

- Sempre verificar se a feature impacta o fluxo de autenticacao. Ref: `.claude/rules/06-seguranca.md` — services com estado de usuario devem ser Scoped, nao Singleton.
- Considerar o N+1 problem ao buscar dados. Ref: P2 no diagnostico — RagService faz N+1 HTTP calls.
- Verificar se a Page tera mais de 30 linhas de `@code`. Se sim, planejar um ViewModel dedicado desde o inicio. Ref: `.claude/rules/01-arquitetura-frontend.md`.
- Considerar testabilidade: o ViewModel sera testavel com mocks das interfaces de service?

## Anti-padroes

- Iniciar implementacao sem verificar o que ja existe — risco de duplicacao.
- Assumir que o backend ja expoe o endpoint necessario sem verificar.
- Planejar logica de negocio diretamente na Page ao inves de no ViewModel.
- Criar feature apenas para Web sem considerar impacto no MAUI.
- Usar cores hardcoded ou inline styles ao planejar a UI. Ref: `.claude/rules/02-design-system.md`.

## Checklist de qualidade

- [ ] Identifiquei todas as Pages, ViewModels, Models e Services afetados.
- [ ] Verifiquei componentes reutilizaveis existentes em `Components/`.
- [ ] Verifiquei classes CSS existentes em `app.css`.
- [ ] Avaliei se a feature precisa de novo ViewModel (>30 linhas de @code).
- [ ] Avaliei impacto cross-platform (Web + MAUI).
- [ ] Verifiquei se a interface de service nao ficara inflada (>12 metodos = sinal de alerta).
- [ ] Planejei testabilidade (ViewModel mockavel, services por interface).
- [ ] Documentei decisao de o que criar vs reutilizar.
