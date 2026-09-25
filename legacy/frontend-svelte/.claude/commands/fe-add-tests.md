# fe-add-tests

Como adicionar testes uteis ao frontend, priorizando ViewModels e Services com xUnit + NSubstitute + FluentAssertions.

## Quando usar

- Ao criar novo ViewModel (obrigatorio: pelo menos 3 testes). Ref: `.claude/rules/04-testes.md`.
- Ao refatorar componente existente (criar testes antes para rede de seguranca).
- Ao encontrar bug que deveria ter sido pego por teste automatizado.
- Para aumentar cobertura em areas criticas (auth, chat, CRUD).

## Pre-condicoes

- Ler `.claude/rules/04-testes.md` (Regras de Testes).
- Verificar que o projeto de testes existe:
  - `IATrainner.Shared.Tests/` para ViewModels e Models.
  - `IATrainner.Web.Tests/` para Services Web (HTTP mocking).
  - Se nao existe: criar o projeto com a stack correta (ver passo 1).
- Conhecer o mapa de dependencias para mocking (qual ViewModel depende de quais interfaces).

## Passos

1. **Garantir infraestrutura de testes:**

   Se o projeto de testes nao existe, criar:

   ```bash
   dotnet new xunit -n IATrainner.Shared.Tests -o IATrainner.Shared.Tests
   dotnet sln add IATrainner.Shared.Tests/IATrainner.Shared.Tests.csproj
   ```

   Adicionar pacotes:
   ```bash
   cd IATrainner.Shared.Tests
   dotnet add package NSubstitute
   dotnet add package FluentAssertions
   dotnet add reference ../IATrainner.Shared/IATrainner.Shared.csproj
   ```

   Para services Web:
   ```bash
   dotnet new xunit -n IATrainner.Web.Tests -o IATrainner.Web.Tests
   dotnet sln add IATrainner.Web.Tests/IATrainner.Web.Tests.csproj
   cd IATrainner.Web.Tests
   dotnet add package NSubstitute
   dotnet add package FluentAssertions
   dotnet add package RichardSzalay.MockHttp
   dotnet add reference ../IATrainner.Web/IATrainner.Web.csproj
   ```

2. **Identificar cenarios obrigatorios:**

   Para cada ViewModel, os cenarios minimos sao:

   | Cenario | O que testar | Exemplo |
   |---------|-------------|---------|
   | Sucesso | Metodo principal retorna resultado esperado, estado atualizado | `LoginAsync` com credenciais validas -> sucesso, limpa erro |
   | Erro do backend | Service retorna erro/falha -> `MensagemErro` populado | `LoginAsync` com credenciais invalidas -> mensagem de erro |
   | Validacao de input | Input invalido -> erro sem chamar service | `LoginAsync` com email vazio -> erro, service NAO chamado |
   | Estado de loading | `Carregando` muda true->false durante operacao | `CarregarAsync` -> Carregando=true durante, false apos |
   | Exception | Service lanca excecao -> capturada, MensagemErro populado | `CarregarAsync` + service throws -> MensagemErro = ex.Message |

   Para Services Web:

   | Cenario | O que testar |
   |---------|-------------|
   | Mapeamento API -> Model | JSON do backend mapeado corretamente para domain model |
   | Erro 401 | Token expirado -> comportamento esperado |
   | Erro de rede | `HttpRequestException` -> capturada |
   | Erro 500 | Resposta de erro do backend -> mapeada como erro |

3. **Escrever o teste seguindo Arrange-Act-Assert:**

   ```csharp
   // Nomenclatura: MetodoTestado_Cenario_ResultadoEsperado
   [Fact]
   public async Task LoginAsync_ComCamposVazios_RetornaFalsoESetaMensagemErro()
   {
       // Arrange
       var authService = Substitute.For<IAuthService>();
       var vm = new LoginViewModel(authService);
       vm.Email = "";
       vm.Senha = "";

       // Act
       var resultado = await vm.LoginAsync();

       // Assert
       resultado.Should().BeFalse();
       vm.MensagemErro.Should().NotBeNullOrEmpty();
       await authService.DidNotReceive().LoginAsync(Arg.Any<string>(), Arg.Any<string>());
   }
   ```

   ```csharp
   [Fact]
   public async Task LoginAsync_ComCredenciaisValidas_RetornaTrueELimpaErro()
   {
       // Arrange
       var authService = Substitute.For<IAuthService>();
       authService.LoginAsync("user@test.com", "Senha12345678")
           .Returns((true, (string?)null));
       var vm = new LoginViewModel(authService);
       vm.Email = "user@test.com";
       vm.Senha = "Senha12345678";

       // Act
       var resultado = await vm.LoginAsync();

       // Assert
       resultado.Should().BeTrue();
       vm.MensagemErro.Should().BeNullOrEmpty();
   }
   ```

   ```csharp
   // Usar [Theory] para multiplas variacoes de input
   [Theory]
   [InlineData("curta1A")]           // < 12 chars
   [InlineData("semmaisculas123")]   // sem maiuscula
   [InlineData("SEMMINIUSCULAS1")]   // sem minuscula
   [InlineData("SemNumeroNenhum")]   // sem numero
   public void ValidarSenha_ComSenhaInvalida_RetornaFalso(string senha)
   {
       // Arrange
       var authService = Substitute.For<IAuthService>();
       var vm = new RegisterViewModel(authService);
       vm.Senha = senha;

       // Act & Assert (validacao interna do VM)
       // Verificar que a senha nao passa nas regras
   }
   ```

4. **Configurar mocks corretamente:**

   ```csharp
   // NSubstitute - configurar retorno
   var service = Substitute.For<IRagService>();
   service.GetCollectionsAsync().Returns(new List<RagCollection>
   {
       new() { Id = "1", Nome = "Test Collection" }
   });

   // NSubstitute - verificar chamada
   await service.Received(1).CreateCollectionAsync(Arg.Is<string>(n => n == "Nova"));

   // NSubstitute - verificar que NAO foi chamado
   await service.DidNotReceive().DeleteCollectionAsync(Arg.Any<string>());

   // NSubstitute - lancar excecao
   service.GetCollectionsAsync().ThrowsAsync(new HttpRequestException("Network error"));
   ```

5. **Para Services Web — usar MockHttpMessageHandler:**

   ```csharp
   [Fact]
   public async Task GetCollectionsAsync_ComRespostaValida_MapeiaCorretamente()
   {
       // Arrange
       var mockHttp = new MockHttpMessageHandler();
       mockHttp.When("/workspaces")
           .Respond("application/json", "{\"workspaces\": [{\"name\": \"test\"}]}");
       mockHttp.When("/workspaces/test")
           .Respond("application/json", "{\"name\": \"test\", \"document_count\": 5}");

       var httpClient = mockHttp.ToHttpClient();
       httpClient.BaseAddress = new Uri("http://test/");

       var factory = Substitute.For<IHttpClientFactory>();
       factory.CreateClient("RagApi").Returns(httpClient);

       var authService = Substitute.For<IAuthService>();
       authService.AccessToken.Returns("fake-token");

       var service = new RagService(factory, authService);

       // Act
       var collections = await service.GetCollectionsAsync();

       // Assert
       collections.Should().HaveCount(1);
       collections[0].Nome.Should().Be("test");
   }
   ```

6. **Executar e validar:**

   ```bash
   dotnet test
   dotnet test --verbosity normal   # para ver nomes dos testes
   dotnet test --collect:"XPlat Code Coverage"   # com cobertura
   ```

## Cuidados

- **Testar comportamento, nao implementacao.** Verificar estado resultante e chamadas a services, nao ordem interna de execucao (a menos que a ordem seja semanticamente importante, como no fluxo de chat RAG). Ref: `.claude/rules/04-testes.md`.
- **NUNCA usar `DateTime.Now` em logica testavel.** Usar `TimeProvider` para determinismo. Ref: `.claude/rules/04-testes.md`.
- **Mocks devem ser minimos.** Configurar apenas o que o cenario de teste precisa. NSubstitute retorna defaults para metodos nao configurados.
- **Testes devem ser independentes.** Cada teste cria seu proprio ViewModel e mocks. Sem estado compartilhado entre testes.
- **Nomes descritivos.** `MetodoTestado_Cenario_ResultadoEsperado` — o nome do teste deve explicar o que esta sendo testado sem ler o codigo.

## Anti-padroes

- Testar que um metodo privado foi chamado — teste de implementacao, nao comportamento.
- Criar mock manual quando NSubstitute resolve.
- Teste que depende de ordem de execucao de outros testes.
- Teste que depende de `DateTime.Now` (nao-deterministico, pode falhar a meia-noite).
- Teste que faz HTTP real a um backend — isso e teste de integracao, nao unitario.
- Teste sem Assert — apenas "nao lanca excecao" nao e teste util.
- Verificar `MensagemErro` com string exata hardcoded — fragil. Preferir `.Should().NotBeNullOrEmpty()` ou `.Should().Contain("palavra-chave")`.
- Teste que passa com mock retornando default (nao configurado) e nao verifica o resultado real.

## Cenarios obrigatorios por ViewModel

| ViewModel | Cenarios minimos |
|-----------|-----------------|
| LoginViewModel | campos vazios, credenciais invalidas, sucesso, exception, estado Carregando |
| RegisterViewModel | campos vazios, senhas diferentes, regras de senha (curta, sem maiuscula, sem minuscula, sem numero), sucesso, falha backend |
| RagCollectionsViewModel | carregar collections, criar com nome vazio, criar sucesso, excluir, exception |
| RagChatViewModel | enviar sem collection, enviar pergunta sucesso (persiste msg user + assistant), auto-create session, exception |
| TrainingViewModel | carregar jobs + modelos, criar com nome vazio, criar sucesso, iniciar/cancelar/excluir, exception |
| DashboardViewModel | carregar agregacao sucesso, falha parcial (um service falha, outros retornam), Task.WhenAll correto |
| TeamsViewModel | criar equipe, convidar membro, remover membro, carregar equipes, exception |

## Checklist de qualidade

- [ ] Projeto de testes existe e compila (`dotnet build`).
- [ ] Stack correta: xUnit + NSubstitute + FluentAssertions.
- [ ] Pelo menos 3 testes por ViewModel (sucesso, erro, validacao).
- [ ] Testes seguem Arrange-Act-Assert.
- [ ] Nomes descritivos: `MetodoTestado_Cenario_ResultadoEsperado`.
- [ ] Mocks configurados com NSubstitute (nao mocks manuais).
- [ ] Testes verificam comportamento (estado, chamadas a services), nao implementacao.
- [ ] Testes sao independentes (sem estado compartilhado).
- [ ] `dotnet test` passa sem falhas.
- [ ] Nenhum teste depende de `DateTime.Now` ou recursos externos.
