# fe-create-component

Como criar um componente Blazor reutilizavel respeitando o Design System e a hierarquia Atoms/Molecules/Organisms.

## Quando usar

- Quando um padrao de markup aparece em 3+ pages. Ref: `.claude/rules/03-reaproveitamento.md`.
- Quando a analise de feature (`/fe-analyze-feature`) identificou necessidade de novo componente.
- Quando refatorando duplicacao existente em componente reutilizavel.

## Pre-condicoes

- Ler `.claude/rules/02-design-system.md` e `.claude/rules/03-reaproveitamento.md`.
- Verificar que o padrao realmente aparece em 3+ pages (padroes com 2 ocorrencias PODEM permanecer duplicados). Ref: `.claude/rules/03-reaproveitamento.md`.
- Verificar que nao existe componente similar em `IATrainner.Shared/Components/`.
- Verificar que existem classes CSS em `app.css` para os estilos do componente.

## Passos

1. **Classificar o componente:**

   | Tipo | Local | Criterio | Exemplos |
   |------|-------|----------|----------|
   | Atom | `Components/Atoms/` | Sem logica, sem dependencias. Elemento visual puro. | LoadingSpinner, Icon, Badge, ProgressBar |
   | Molecule | `Components/Molecules/` | Composicao de Atoms com slots (`RenderFragment`). Logica minima. | AlertMessage, EmptyState, PageHeader, FormGroup |
   | Organism | `Components/Organisms/` | Logica de dominio, pode injetar services. | ServerStatusCards, ChatMessageList, FormCard |

2. **Criar o arquivo .razor:**
   - Local: `IATrainner.Shared/Components/{Tipo}/{Nome}.razor`.
   - Definir `[Parameter]` para cada propriedade configuravel.
   - Usar tipos fortes para Parameters (nao `string` para tudo — usar enums para variantes).
   - Definir valores default com `= valor` nos Parameters quando aplicavel.
   - Usar `RenderFragment` para slots (conteudo variavel).
   - Usar `RenderFragment<T>` para templates tipados.
   - Adicionar `EventCallback` ou `EventCallback<T>` para eventos.
   - Documentar Parameters com XML comments (`/// <summary>`).

   **Exemplo Atom (LoadingSpinner):**
   ```razor
   @* Components/Atoms/LoadingSpinner.razor *@

   <div class="loading-container">
       <div class="spinner"></div>
       @if (!string.IsNullOrEmpty(Texto))
       {
           <p>@Texto</p>
       }
   </div>

   @code {
       /// <summary>Texto exibido abaixo do spinner. Default: "Carregando..."</summary>
       [Parameter] public string Texto { get; set; } = "Carregando...";
   }
   ```

   **Exemplo Molecule (AlertMessage):**
   ```razor
   @* Components/Molecules/AlertMessage.razor *@

   @if (!string.IsNullOrEmpty(Mensagem))
   {
       <div class="@CssClass">@Mensagem</div>
   }

   @code {
       /// <summary>Texto da mensagem. Se vazio, nao renderiza.</summary>
       [Parameter] public string Mensagem { get; set; } = string.Empty;

       /// <summary>Tipo da mensagem: danger, success, warning, info.</summary>
       [Parameter] public string Tipo { get; set; } = "danger";

       private string CssClass => $"alert alert-{Tipo}";
   }
   ```

   **Exemplo Molecule com RenderFragment (PageHeader):**
   ```razor
   @* Components/Molecules/PageHeader.razor *@

   <div class="page-header">
       <div>
           <h1>@Titulo</h1>
           @if (!string.IsNullOrEmpty(Subtitulo))
           {
               <p class="page-subtitle">@Subtitulo</p>
           }
       </div>
       @if (Acoes != null)
       {
           <div class="page-header-actions">@Acoes</div>
       }
   </div>

   @code {
       [Parameter, EditorRequired] public string Titulo { get; set; } = string.Empty;
       [Parameter] public string? Subtitulo { get; set; }
       [Parameter] public RenderFragment? Acoes { get; set; }
   }
   ```

3. **Criar scoped CSS (se necessario):**
   - Arquivo: `{Nome}.razor.css` no mesmo diretorio.
   - Usar APENAS para estilos exclusivos deste componente.
   - Referenciar tokens CSS (`var(--color-*)`, `var(--radius-*)`, etc.).
   - NAO redeclarar estilos que ja existem em `app.css` (usar classes existentes no markup).

4. **Registrar no _Imports.razor (se em subpasta profunda):**
   - Se o componente esta em `Components/Atoms/`, ele ja deve ser acessivel via namespace.
   - Verificar que `IATrainner.Shared/Components` esta nos `@using` do `_Imports.razor`.

5. **Substituir nas Pages existentes:**
   - Buscar todas as ocorrencias do padrao duplicado nas Pages.
   - Substituir pelo componente com os Parameters adequados.
   - Verificar que o visual permanece identico apos substituicao.

6. **Testar o componente (se Organism com logica):**
   - Organisms com logica de dominio devem ter testes bUnit.
   - Atoms e Molecules puras nao precisam de testes unitarios (testadas visualmente).

## Cuidados

- **Maximo 8 Parameters.** Componente com >8 Parameters e sinal de abstracao prematura. Ref: `.claude/rules/03-reaproveitamento.md`.
- **Nao generalizar prematuramente.** Se duas Pages usam o padrao de formas diferentes (ex: RAG/Chat com CSS classes vs Models/Chat com inline styles), padronizar o CSS ANTES de criar o componente compartilhado. Ref: `.claude/rules/03-reaproveitamento.md` — PROIBIDO ChatLayout compartilhado antes de padronizar CSS.
- **Respeitar a hierarquia Atoms -> Molecules -> Organisms.** Molecules compoem Atoms, Organisms compoem Molecules. Nao pular niveis.
- **Valores default razoaveis.** Todo Parameter deve ter um default sensato para que o componente funcione com o minimo de configuracao.
- **Nao criar variante de card redeclarando base.** Usar composicao: `.card.variante`. Ref: `.claude/rules/02-design-system.md`.

## Anti-padroes

- Criar componente para padrao que aparece em <3 pages (abstracao prematura).
- Componente com >8 Parameters — provavelmente deveria ser decomposto.
- Componente com >3 `@if` condicionais para acomodar usos diferentes — generico demais.
- Usar inline styles dentro de componentes reutilizaveis — usar classes CSS.
- Duplicar SVG icons inline dentro de componentes — criar Atom de Icon.
- Criar componente que depende de ViewModel especifico — Atoms e Molecules devem ser agnoscticos.
- Criar `.razor.css` que redeclara estilos ja existentes em `app.css`.
- Usar `string` para variantes quando enum seria mais type-safe.

## Checklist de qualidade

- [ ] Padrao aparece em 3+ pages (justificativa para componente).
- [ ] Classificado corretamente (Atom/Molecule/Organism).
- [ ] Arquivo em `Components/{Tipo}/{Nome}.razor`.
- [ ] Parameters tipados com valores default.
- [ ] Parameters documentados com XML comments.
- [ ] Maximo 8 Parameters.
- [ ] Usa tokens CSS (sem cores/radius hardcoded).
- [ ] Usa classes CSS existentes de `app.css` quando aplicavel.
- [ ] `RenderFragment` para slots de conteudo variavel.
- [ ] `EventCallback` para eventos emitidos.
- [ ] Acessibilidade: `aria-label` em elementos interativos, `role` se necessario.
- [ ] Funciona em dark e light theme.
- [ ] Substituido nas Pages existentes (duplicacao eliminada).
- [ ] Visual identico apos substituicao (sem regressao).
