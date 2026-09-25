# fe-refactor-component

Como refatorar componentes, ViewModels ou Services sem quebrar contratos existentes.

## Quando usar

- Ao aplicar recomendacoes do diagnostico arquitetural (P1-P10).
- Ao separar ViewModel com responsabilidade dupla (ex: RagViewModel -> RagCollectionsViewModel + RagChatViewModel).
- Ao extrair logica inline de Page para ViewModel.
- Ao segregar interface inflada (ex: ITrainingService -> interfaces menores).
- Ao migrar Singleton para Scoped, SetAuthAsync para DelegatingHandler, ou outras migracoes listadas em `.claude/rules/08-migracoes-pendentes.md`.

## Pre-condicoes

- Ler arquivos em `.claude/rules/` — especialmente `01-arquitetura-frontend.md`, `03-reaproveitamento.md` e `06-seguranca.md`.
- Identificar TODOS os consumidores do componente/service/ViewModel a ser refatorado:
  - Quais Pages injetam ou usam o artefato?
  - Quais ViewModels dependem dele?
  - Quais registros de DI referenciam a interface/classe?
  - O MAUI tambem usa? Ref: `.claude/rules/01-arquitetura-frontend.md` — novo service = AMBAS plataformas.
- Se existem testes: lê-los para entender o contrato esperado. Se nao existem: considerar escrever testes ANTES do refactoring (ver `/fe-add-tests`).

## Passos

1. **Mapear dependentes:**
   - Buscar com `grep` todas as referencias ao tipo que sera refatorado (interface, classe, namespace).
   - Listar: Pages que injetam (`@inject`), ViewModels que recebem no construtor, registros DI (`AddScoped`, `AddSingleton`), e outros Services que dependem.
   - Documentar cada consumidor e como usa o artefato.

2. **Definir estrategia de refactoring:**

   | Tipo de Refactoring | Estrategia |
   |---------------------|-----------|
   | Extrair logica de Page para ViewModel | Mover variaveis e metodos do `@code` para novo ViewModel. Page passa a usar binding. Teste: mesmo comportamento visual. |
   | Separar ViewModel com responsabilidade dupla | Criar dois ViewModels novos. Cada Page instancia o seu. Mover propriedades e metodos para o ViewModel correto. |
   | Segregar interface inflada | Criar interfaces menores por dominio. Manter interface original como agregadora (herda das menores) durante migracao, para nao quebrar consumidores existentes. Depois remover quando todos migrarem. |
   | Migrar Singleton -> Scoped | Alterar registro no DI. Verificar que dependentes tambem sao Scoped (Scoped NAO pode depender de Singleton mutavel, mas Singleton pode depender de Scoped via `IServiceScopeFactory`). |
   | Extrair componente reutilizavel | Ver `/fe-create-component`. Substituir markup inline pelo componente em cada Page. |
   | Mover boilerplate para ViewModelBase | Mover propriedades comuns (Carregando, MensagemErro, MensagemSucesso) para a base. Remover dos ViewModels filhos. |

3. **Executar refactoring:**
   - Fazer UM tipo de refactoring por vez. Nao misturar separacao de ViewModel com migrar Singleton -> Scoped no mesmo passo.
   - Manter a assinatura publica inalterada durante o refactoring (metodos, propriedades, Parameters).
   - Se for necessario mudar assinatura, atualizar TODOS os consumidores no mesmo commit.

4. **Verificar integridade cross-platform:**
   - Se a mudanca afeta interface de service: atualizar implementacoes Web E MAUI.
   - Se a mudanca afeta DI: atualizar `Program.cs` (Web) E `MauiProgram.cs` (MAUI).
   - Se novo ViewModel: verificar que a Page funciona em ambas plataformas.

5. **Verificar integridade visual:**
   - Executar `./run.sh web` e navegar pelas Pages afetadas.
   - Comparar visual antes e depois — deve ser identico.
   - Testar dark e light theme.
   - Testar responsividade (<768px).

6. **Executar testes:**
   - Rodar `dotnet test` para verificar que testes existentes nao quebraram.
   - Se nao existem testes para o artefato refatorado: escrever pelo menos 3 testes apos o refactoring. Ref: `/fe-add-tests`.
   - Se testes existentes quebraram por mudanca de contrato intencional: atualizar os testes.

## Cuidados

- **Nao quebrar o contrato publico sem atualizar todos os consumidores.** Se um metodo muda de assinatura, todos os chamadores devem ser atualizados no mesmo commit.
- **Singleton -> Scoped exige cuidado com dependencias cruzadas.** `IChatHistoryService` PODE ser Singleton (MongoDB client e thread-safe). `IPlatformService` PODE ser Singleton (sem estado mutavel). `IAuthService`, `ITrainingService`, `IRagService` DEVEM ser Scoped. Ref: `.claude/rules/06-seguranca.md`.
- **Ao separar ViewModel, nao compartilhar estado entre os novos VMs.** Cada ViewModel e independente, instanciado pela sua Page.
- **Ao segregar interface, usar migracao progressiva.** Interface original pode herdar das menores durante a transicao:
  ```csharp
  // Migracao progressiva
  interface ITrainingService : ITrainingJobService, IModelService, ITeamService, IChatService { }
  ```
- **Ao extrair componente, o markup resultante deve ser identico.** Diferenca visual = bug de refactoring.

## Anti-padroes

- Refatorar sem mapear dependentes — risco de quebrar consumidor esquecido.
- Misturar multiplos refactorings no mesmo passo — dificulta debug se algo quebrar.
- Refatorar sem testes e sem verificacao manual — refactoring "no escuro". Ref: R7 do diagnostico de testes.
- Criar ViewModelBase com metodos de lifecycle (`CarregarAsync`, `ExecutarComLoadingAsync`). Ref: `.claude/rules/03-reaproveitamento.md` — apenas propriedades comuns na base.
- Criar base class para Web services. Ref: `.claude/rules/03-reaproveitamento.md` — diferencas de JsonOpts e auth justificam implementacoes independentes.
- Alterar registro DI de um service sem verificar AMBAS plataformas.

## Checklist de qualidade

- [ ] Todos os consumidores do artefato foram mapeados (Pages, ViewModels, DI, MAUI).
- [ ] Estrategia de refactoring definida e documentada antes de comecar.
- [ ] UM tipo de refactoring por vez.
- [ ] Contrato publico mantido OU todos os consumidores atualizados.
- [ ] Implementacao atualizada em AMBAS plataformas (Web + MAUI).
- [ ] DI atualizado em `Program.cs` e `MauiProgram.cs`.
- [ ] Visual identico antes e depois (verificado manualmente).
- [ ] Dark e light theme funcionam.
- [ ] `dotnet test` passa sem falhas.
- [ ] Pelo menos 3 testes existem para o artefato refatorado.
- [ ] Nenhum warning de compilacao novo introduzido.
