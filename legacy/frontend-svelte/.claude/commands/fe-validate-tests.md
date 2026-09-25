# fe-validate-tests

Como validar a confiabilidade dos testes existentes. Detectar falso positivo, falso negativo e flakiness.

## Quando usar

- Apos adicionar novos testes (validar que realmente testam algo).
- Apos refactoring (validar que testes existentes ainda sao relevantes).
- Periodicamente (a cada sprint ou milestone) para manter qualidade da suite.
- Quando um bug chega a producao apesar dos testes passarem — possivel falso negativo.
- Quando testes falham intermitentemente — possivel flakiness.

## Pre-condicoes

- Ler `.claude/rules/04-testes.md` (Regras de Testes).
- Ter suite de testes rodando com `dotnet test` sem erros de infra.
- Conhecer a stack: xUnit + NSubstitute + FluentAssertions + bUnit (componentes).

## Passos

1. **Detectar falsos positivos (teste passa quando nao deveria):**

   Um falso positivo e um teste que passa sempre, independente do codigo estar correto ou nao. Indica que o teste nao verifica nada util.

   **Tecnica: Mutation Test Manual**
   - Introduzir um bug intencional no codigo testado (ex: inverter uma condicao, remover uma chamada a service, trocar retorno de sucesso por erro).
   - Rodar `dotnet test`.
   - Se o teste AINDA passa: e falso positivo. O teste nao esta verificando o comportamento correto.
   - Reverter o bug.

   **Checklist de falso positivo:**
   - [ ] Teste tem Assert/Should? Teste sem assert sempre passa.
   - [ ] Mock retorna default e teste verifica default? Ex: `service.GetCollectionsAsync()` nao configurado retorna `null`, teste verifica `collections.Should().BeNull()` — passa sem testar nada.
   - [ ] Teste verifica exception com `Assert.ThrowsAsync` mas o metodo nunca lanca nesse cenario?
   - [ ] Teste usa `Arg.Any<T>()` em verificacao de chamada quando deveria verificar valor especifico?

   **Padroes comuns de falso positivo neste projeto:**
   ```csharp
   // FALSO POSITIVO: mock nao configurado, test verifica null
   [Fact]
   public async Task CarregarAsync_RetornaCollections()
   {
       var service = Substitute.For<IRagService>();
       // service.GetCollectionsAsync() NAO configurado -> retorna default (null ou empty)
       var vm = new RagCollectionsViewModel(service);
       await vm.CarregarAsync();
       vm.Collections.Should().BeEmpty(); // Passa mas nao testou nada real
   }

   // CORRETO: mock configurado com dados, verifica dados
   [Fact]
   public async Task CarregarAsync_RetornaCollections()
   {
       var service = Substitute.For<IRagService>();
       service.GetCollectionsAsync().Returns(new List<RagCollection>
       {
           new() { Id = "1", Nome = "Test" }
       });
       var vm = new RagCollectionsViewModel(service);
       await vm.CarregarAsync();
       vm.Collections.Should().HaveCount(1);
       vm.Collections[0].Nome.Should().Be("Test");
   }
   ```

2. **Detectar falsos negativos (teste deveria falhar mas nao falha, ou nao existe):**

   Um falso negativo e quando o codigo tem bug mas nenhum teste detecta. Mais difícil de encontrar — aparece quando bugs chegam a producao.

   **Tecnica: Mapear cenarios nao cobertos**
   - Para cada ViewModel, listar os cenarios obrigatorios (ver `/fe-add-tests`).
   - Verificar quais cenarios NAO tem teste.
   - Priorizar: cenarios de auth (login, token expirado), cenarios de dados (mapeamento API), cenarios de estado (Carregando, MensagemErro).

   **Cenarios de alto risco para falso negativo neste projeto:**

   | Cenario | Risco | Teste necessario |
   |---------|-------|-----------------|
   | JWT parse com claims faltando | Alto (ref: R1 do diagnostico de testes) | `AuthService.LoginAsync` com JWT sem claim `name` |
   | Mapeamento API com campo renomeado | Alto (ref: R3) | `RagService.GetCollectionsAsync` com JSON sem campo esperado |
   | RagViewModel.EnviarPerguntaAsync com 7 passos | Alto (ref: R6) | Verificar cada passo: auto-create session, persist msg, query, persist response |
   | Validacao de senha inconsistente | Alto (ref: R2) | `RegisterViewModel.ValidarSenha` com todas as regras |
   | N+1 queries (performance) | Medio (ref: R4) | Contar HTTP calls em teste de integracao |

3. **Detectar flakiness (teste falha intermitentemente):**

   **Tecnica: Executar multiplas vezes**
   ```bash
   # Rodar 10 vezes para detectar flakiness
   for i in $(seq 1 10); do dotnet test --no-build 2>&1 | tail -1; done
   ```

   **Causas comuns de flakiness neste projeto:**

   | Causa | Deteccao | Correcao |
   |-------|----------|----------|
   | `DateTime.Now` em logica testada | Buscar `DateTime.Now` no codigo | Usar `TimeProvider` (ref: `.claude/rules/04-testes.md`) |
   | Ordem de execucao de `Task.WhenAll` | Teste assume ordem de retorno | Verificar resultado final, nao ordem |
   | Race condition em Singleton | Testes paralelos compartilham state | Cada teste cria instancias independentes |
   | Timer/delay dependente de velocidade | `Task.Delay` em codigo testado | Mock do timer ou aumentar tolerancia |

4. **Validar relevancia apos refactoring:**

   Apos refactoring, testes podem ficar obsoletos ou irrelevantes:

   - **Teste que verifica implementacao antiga:** Se o refactoring mudou a estrutura interna mas manteve comportamento, o teste pode continuar passando mas testando algo que nao existe mais.
   - **Teste que verifica string exata:** `MensagemErro.Should().Be("Email ou senha invalidos")` quebra se a mensagem mudar — fragil.
   - **Teste que verifica chamada de metodo renomeado:** Se o metodo mudou de nome, o teste com `Received()` no metodo antigo compila (NSubstitute usa interface) mas nao testa nada util.

   **Checklist pos-refactoring:**
   - [ ] Todos os testes existentes ainda compilam?
   - [ ] Testes que falharam: falharam por mudanca de contrato intencional?
   - [ ] Testes que passaram: ainda sao relevantes para o codigo refatorado? (fazer mutation test manual)
   - [ ] Novos cenarios foram introduzidos pelo refactoring que precisam de teste?

5. **Validar cobertura com intention:**

   Cobertura de linhas nao e suficiente — verificar cobertura de CENARIOS:

   ```bash
   # Gerar report de cobertura
   dotnet test --collect:"XPlat Code Coverage"
   # Analisar se cenarios criticos estao cobertos, nao apenas linhas
   ```

   **Pergunta-chave:** Para cada metodo publico do ViewModel/Service, existe teste para:
   - [ ] Input valido -> resultado esperado?
   - [ ] Input invalido -> erro esperado?
   - [ ] Service retorna erro -> tratamento correto?
   - [ ] Service lanca exception -> capturada?
   - [ ] Estado de loading muda corretamente?

## Cuidados

- **Mutation testing e a forma mais confiavel de validar testes.** Ferramentas como Stryker.NET automatizam isso, mas mutation test manual (introduzir bug, ver se teste falha) funciona para projetos menores.
- **Nao otimizar para cobertura de linhas.** 100% de cobertura com testes que nao verificam nada e pior que 60% de cobertura com testes que realmente detectam bugs.
- **Testes frageis sao piores que nenhum teste.** Se o teste quebra com qualquer mudanca trivial (reordenacao de propriedades, mudanca de mensagem), ele custa mais do que vale.

## Anti-padroes

- Confiar que "testes passam = codigo correto" sem validar a qualidade dos testes.
- Adicionar `[Fact]` sem `Assert`/`Should` — teste que "nao lanca excecao" raramente e util.
- Verificar `MensagemErro` com string exata hardcoded — fragil e quebra com qualquer mudanca de texto.
- Ignorar teste flakey com `[Trait("Category", "Flaky")]` sem investigar a causa.
- Desabilitar teste que falha ao inves de corrigir — divida tecnica escondida.
- Rodar testes apenas localmente sem CI/CD — nao garante consistencia em outros ambientes.

## Checklist de qualidade

- [ ] Mutation test manual: bug introduzido -> pelo menos 1 teste falha.
- [ ] Nenhum teste sem Assert/Should.
- [ ] Nenhum teste que verifica default de mock nao configurado.
- [ ] Cenarios obrigatorios cobertos para cada ViewModel (sucesso, erro, validacao, loading, exception).
- [ ] Nenhum `DateTime.Now` em logica testada.
- [ ] Testes rodam 10x sem falha intermitente.
- [ ] Testes sao independentes (rodam em qualquer ordem).
- [ ] Apos refactoring: todos os testes revisados para relevancia.
- [ ] `dotnet test` passa consistentemente.
