# API de coleções

Origem: C-M2-COLLECTIONS-API. Regras comuns (sessão, CSRF, isolamento, formatos) no [README](README.md); códigos em [erros](erros.md); tabela `collections` em [banco-de-dados](banco-de-dados.md).

A coleção agrupa documentos do mesmo dono e será o escopo das conversas no M3. Um documento pertence a no máximo uma coleção (`collectionId` opcional).

## Modelo

`Collection`:

| Campo | Tipo | Origem |
|---|---|---|
| `id` | uuid | `collections.id` |
| `name` | string | `collections.name` |
| `description` | string \| null | `collections.description` |
| `documentCount` | integer | documentos da coleção fora de `deleting` |
| `createdAt` | instante | `collections.created_at` |
| `updatedAt` | instante | `collections.updated_at` |

Normalização feita pela API antes de validar:

- `name`: Unicode NFC, pontas aparadas e cada sequência de espaços em branco reduzida a um espaço; 1 a 120 caracteres (unidades UTF-16); caractere de controle dá `invalid`. `name_normalized` é o `name` em minúsculas pela cultura invariante; a unicidade por dono vale entre coleções `active`.
- `description`: NFC, `\r\n` vira `\n`, pontas aparadas; vazia vira `null`; até 2000 caracteres; controle além de `\n` e `\t` dá `invalid`.

## Rotas

| Método e rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /api/collections` | `{"name", "description"?}` | `201`, `Location: /api/collections/{id}`, `Collection` | 422 `validation.failed`; 409 `collection.name_taken` |
| `GET /api/collections` | — | `200 {"items": Collection[]}`, só `active`, em ordem de `name_normalized` | — |
| `GET /api/collections/{id}` | — | `200 Collection` | 404 `collection.not_found` |
| `PATCH /api/collections/{id}` | `{"name"?, "description"?}` | `200 Collection` | 404 `collection.not_found`; 409 `collection.name_taken`; 422 `validation.failed` |
| `DELETE /api/collections/{id}` | — | `202 {"id", "status": "deleting"}` | 404 `collection.not_found` |

- **PATCH:** campo ausente fica como está; `"description": null` apaga a descrição; `"name": null` dá 422 `required`. Corpo sem campos devolve a coleção sem alterar.
- **DELETE:** na mesma transação, a coleção e seus documentos passam a `deleting` (somem de listas e detalhes), o nome fica livre e o outbox recebe `collection.deletion_requested`. O Worker apaga objetos, (M3) trechos e vetores, as linhas dos documentos e por fim a coleção ([ciclo-de-vida-documento](ciclo-de-vida-documento.md)). Nova chamada devolve 404. A interface confirma antes, mostrando `documentCount`.
- Não há limite de coleções por dono no M2 nem paginação da listagem.

## Exemplo

```http
POST /api/collections
Content-Type: application/json
X-IAT-Request: 1

{"name": "Artigos de exemplo", "description": null}
```

```http
HTTP/1.1 201 Created
Location: /api/collections/0192f5c4-8e1a-7c3b-9d2e-5a6b7c8d9e0f
Cache-Control: no-store

{"id":"0192f5c4-8e1a-7c3b-9d2e-5a6b7c8d9e0f","name":"Artigos de exemplo","description":null,"documentCount":0,"createdAt":"2026-09-25T12:00:00+00:00","updatedAt":"2026-09-25T12:00:00+00:00"}
```
