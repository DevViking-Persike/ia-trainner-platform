# Portas .NET do M2

Origem: C-M2-PORTS. O Domain não referencia SDK nem infraestrutura; a Application define casos de uso e portas; a Infrastructure implementa; API e Worker são composition roots. Assinaturas abaixo são o mínimo acordado; métodos adicionais seguem as mesmas regras de dono.

## Composição

- `IApiModule { void MapEndpoints(RouteGroupBuilder api); }` recebe o grupo `/api` já autorizado (`PlatformUser`, `no-store`, CSRF); `IServiceModule { void AddServices(IServiceCollection services, IConfiguration configuration); }`. Ambos são descobertos por varredura de assembly, para que pacotes paralelos não editem `Program.cs`.
- Testes de arquitetura: o Domain não referencia pacotes de infraestrutura; a API não referencia `IDocumentWorkerStore` nem `IWorkerUnitOfWork`, as únicas portas com leitura sem dono.

## Application/Common

```csharp
public interface ICurrentUser { UserContext Current { get; } } // de ZitadelClaims.ToUserContext; sem usuário lança UnauthenticatedException (401)
public interface IClock { DateTimeOffset UtcNow { get; } }

public interface IUnitOfWork { Task<IUnitOfWorkScope> BeginAsync(CancellationToken ct); }
public interface IUnitOfWorkScope : IAsyncDisposable // uma transação PostgreSQL; sem CommitAsync, rollback
{
    ICollectionRepository Collections { get; }
    IDocumentRepository Documents { get; }
    IConsentRepository Consents { get; }
    IOutbox Outbox { get; }
    IInboxStore Inbox { get; }
    Task CommitAsync(CancellationToken ct);
}

public sealed record IntegrationEvent(Guid MessageId, string Type, int SchemaVersion, Guid AggregateId,
    int AggregateVersion, string OwnerSub, string? OrganizationId, DateTimeOffset OccurredAt, object Data);
public interface IOutbox { void Enqueue(IntegrationEvent message); } // gravado no commit, com o contexto de trace atual
public interface IInboxStore { Task<bool> TryMarkProcessedAsync(string consumer, Guid messageId, CancellationToken ct); }

public enum ErrorKind { Invalid, Validation, NotFound, Conflict, TooLarge, Unsupported, Unavailable }
public sealed record ApplicationError(string Code, ErrorKind Kind,
    IReadOnlyDictionary<string, string[]>? FieldErrors = null,
    IReadOnlyDictionary<string, object?>? Extensions = null);
// Result<T>: Success(T) ou Failure(ApplicationError); casos de uso não lançam exceção para regra de negócio.
```

A API converte `ErrorKind` em status: `Invalid` 400, `Validation` 422, `NotFound` 404, `Conflict` 409, `TooLarge` 413, `Unsupported` 415, `Unavailable` 503; `Code` vira `code` ([erros](erros.md)). Conflito de versão no repositório vira `ConcurrencyConflictException`, tratada pelo caso de uso (releitura até 3 vezes, depois `concurrency.conflict`).

## Application/Documents

```csharp
public interface ICollectionRepository // todo método exige ownerSub
{
    Task<Collection?> FindActiveAsync(string ownerSub, Guid id, CancellationToken ct);
    Task<Collection?> LockActiveAsync(string ownerSub, Guid id, CancellationToken ct); // FOR SHARE, no upload
    Task<IReadOnlyList<CollectionSummary>> ListActiveAsync(string ownerSub, CancellationToken ct); // com documentCount
    Task AddAsync(Collection collection, CancellationToken ct); // unicidade → collection.name_taken
    Task UpdateAsync(Collection collection, CancellationToken ct); // WHERE version = esperado
}

public interface IDocumentRepository // todo método exige ownerSub e ignora deleting
{
    Task<Document?> FindAsync(string ownerSub, Guid id, CancellationToken ct);
    Task<Guid?> FindIdBySha256Async(string ownerSub, string sha256, CancellationToken ct);
    Task<StoredPage?> FindPageAsync(string ownerSub, Guid id, int number, CancellationToken ct); // Number, Method, CharCount, Text
    Task<DocumentListPage> ListAsync(string ownerSub, DocumentQuery query, CancellationToken ct);
    Task<DocumentCounts> CountAsync(string ownerSub, CancellationToken ct);
    Task AddAsync(Document document, CancellationToken ct); // com os passos; unicidade de sha256 → document.duplicate
    Task UpdateAsync(Document document, CancellationToken ct); // com os passos; WHERE version = esperado
    Task MarkCollectionDocumentsDeletingAsync(string ownerSub, Guid collectionId, DateTimeOffset at, CancellationToken ct);
}

public interface IDocumentWorkerStore // só o Worker registra; leituras sem dono
{
    Task<Document?> GetForProcessingAsync(Guid id, CancellationToken ct); // inclui deleting
    Task<Collection?> GetCollectionForDeletionAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<Guid>> ListCollectionDocumentIdsAsync(Guid collectionId, CancellationToken ct);
    Task DeletePagesAsync(Guid documentId, CancellationToken ct);
    Task AddPagesAsync(Guid documentId, string ownerSub, string method, IReadOnlyList<DocumentPage> pages, CancellationToken ct);
    Task DeleteDocumentAsync(Guid id, CancellationToken ct); // páginas e passos em cascata
    Task DeleteCollectionAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<StaleItem>> ListStaleAsync(DateTimeOffset now, CancellationToken ct); // varredura
}
public interface IWorkerUnitOfWork { Task<IWorkerUnitOfWorkScope> BeginAsync(CancellationToken ct); }
public interface IWorkerUnitOfWorkScope : IUnitOfWorkScope { IDocumentWorkerStore WorkerStore { get; } }

public enum BucketKind { Documents, Datasets, Artifacts }
public sealed record ObjectLocation(BucketKind Bucket, string Key);
public sealed record StoredObject(long SizeBytes, string Sha256);
public interface IObjectStorage
{
    // Streaming; passou de maxBytes: aborta e lança ObjectTooLargeException. Falha do serviço: StorageUnavailableException.
    Task<StoredObject> PutAsync(ObjectLocation location, Stream content, string contentType, long maxBytes, CancellationToken ct);
    Task<Stream> OpenReadAsync(ObjectLocation location, CancellationToken ct);
    Task DeleteAsync(ObjectLocation location, CancellationToken ct); // idempotente
    IAsyncEnumerable<StoredObjectInfo> ListAsync(BucketKind bucket, string prefix, CancellationToken ct); // órfãos
}

public static class DocumentStorageKey { public static string For(string ownerSub, Guid documentId); } // ver armazenamento-s3
public static class MediaTypeDetector { public static string? Detect(ReadOnlySpan<byte> head, string fileName); } // null = não aceito
```

Os agregados `Collection` e `Document` ficam no Domain (`Domain/Documents`), com as transições de [ciclo-de-vida-documento](ciclo-de-vida-documento.md), `Version` para concorrência e a normalização de nomes de [api-colecoes](api-colecoes.md).

## Application/Consents

```csharp
public sealed record ConsentNotice(string Version, string Title, IReadOnlyList<string> Paragraphs);
public static class GeminiNotice { public static ConsentNotice Current { get; } } // gemini-v1; texto imutável por versão
public interface IConsentRepository // todo método exige ownerSub
{
    Task<ConsentState> GetAsync(string ownerSub, string purpose, string currentVersion, CancellationToken ct);
    Task<bool> IsActiveAsync(string ownerSub, string purpose, string version, CancellationToken ct);
    Task<UserConsent> AcceptAsync(UserConsent consent, CancellationToken ct); // idempotente por versão ativa
    Task RevokeAsync(string ownerSub, string purpose, DateTimeOffset at, CancellationToken ct);
}
```

## Application/Ai

```csharp
public sealed record DocumentPage(int Number, string Text); // existente

public interface IDocumentTextExtractor // Infrastructure/Ai/Extraction (PdfPig)
{
    // PDF: uma entrada por página física, só camada de texto (vazia quando não há).
    // Lança DocumentReadException("document.encrypted" | "document.corrupted").
    Task<IReadOnlyList<DocumentPage>> ExtractAsync(Stream document, string mediaType, CancellationToken ct);
    // PDF de uma única página (numeração a partir de 1), para OCR.
    Task<ReadOnlyMemory<byte>> ExtractPageAsync(Stream document, int number, CancellationToken ct);
}

public interface IOcrProvider // Infrastructure/Ai/Gemini/Ocr, SDK oficial Google.GenAI
{
    // Uma página por chamada (PDF de uma página ou imagem); devolve texto puro, "" se nada legível ou se o
    // provedor recusou a página. 429/5xx/tempo esgotado/chaves recusadas: ProviderUnavailableException(RetryAfter?).
    // Entrada inválida para o provedor: DocumentReadException("document.corrupted").
    Task<string> RecognizeAsync(ReadOnlyMemory<byte> page, string mediaType, CancellationToken ct);
}
```

TXT e MD não passam por essas portas: decodificação UTF-8 estrita e paginação lógica são funções puras da Application. `ProviderUnavailableException`, `StorageUnavailableException`, `TimeoutException` e falhas transitórias do Npgsql são as únicas repetidas na própria operação; qualquer outra exceção leva à reexecução do handler ([eventos-kafka](eventos-kafka.md)). Nenhuma implementação em memória substitui as portas duráveis em produção.
