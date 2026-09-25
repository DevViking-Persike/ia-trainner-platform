# Consentimento para o uso do Google Gemini

Decisão do titular em 25/09/2026: documentos podem ir ao Gemini para OCR (M2), embeddings e respostas (M3), com aviso claro e consentimento registrado por usuário e versionado. A P7 é último recurso e nunca mistura espaços vetoriais. Regras comuns no [README](README.md); códigos em [erros](erros.md).

## Regras

- Upload e reprocessamento exigem consentimento vigente: aceite não revogado da versão atual do aviso. Sem ele, 409 `consent.required`.
- O Worker confere de novo antes de chamar o Gemini; se o consentimento sumiu, o documento vai a `failed` com `document.consent_required` (reprocessável).
- A exigência vale para todos os tipos, inclusive TXT, MD e PDF com camada de texto: no M3 todo documento pronto gera embeddings no Gemini.
- Revogar bloqueia novos envios, reprocessamentos e (M3) perguntas; não apaga documentos. O que já foi enviado ao Google não pode ser recolhido; o usuário pode excluir seus documentos a qualquer momento, em definitivo.
- Texto do aviso alterado é uma nova versão: todos precisam aceitar de novo.

## Aviso

O texto vive no backend (`IATrainner.Application`), imutável por versão; API e Worker usam a mesma versão atual, definida em código (sem configuração). O Angular exibe `title` e `paragraphs` como texto puro, sem HTML. Versão inicial `gemini-v1`, rascunho sujeito à revisão do titular antes de publicar:

> **Uso do Google Gemini no processamento dos seus documentos**
>
> 1. Para ler imagens e PDFs digitalizados, a IA Trainner envia essas páginas ao Google Gemini, serviço de IA do Google. Quando as conversas sobre documentos forem liberadas, o texto dos seus documentos e as suas perguntas também serão enviados ao Gemini para indexação e respostas.
> 2. O envio usa a conta de API da plataforma. O Google trata esse conteúdo conforme os termos da Gemini API aplicáveis a essa conta; a IA Trainner não controla esse tratamento.
> 3. Envie apenas documentos que você pode compartilhar com terceiros. Evite dados pessoais sensíveis e material confidencial.
> 4. Seus arquivos e o texto extraído ficam na infraestrutura da IA Trainner, isolados por conta.
> 5. Você pode revogar este consentimento no seu perfil. A revogação bloqueia novos envios e reprocessamentos, mas não recupera o que já foi enviado ao Google. Excluir um documento o remove em definitivo da plataforma.

Versões seguem `^[a-z0-9]+(-[a-z0-9]+)*$`, até 32 caracteres (`gemini-v1`, `gemini-v2`...).

## API

| Método e rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `GET /api/consents/gemini` | — | `200 GeminiConsent` | — |
| `PUT /api/consents/gemini` | `{"noticeVersion"}` | `200 GeminiConsent`, idempotente | 409 `consent.notice_outdated`; 422 `validation.failed` |
| `DELETE /api/consents/gemini` | — | `204`, idempotente | — |

`GeminiConsent`:

```json
{
  "purpose": "gemini",
  "notice": {
    "version": "gemini-v1",
    "title": "Uso do Google Gemini no processamento dos seus documentos",
    "paragraphs": ["Para ler imagens e PDFs digitalizados, ..."]
  },
  "accepted": true,
  "acceptedAt": "2026-09-25T12:00:00+00:00",
  "lastAcceptedVersion": "gemini-v1"
}
```

| Campo | Regra |
|---|---|
| `accepted` | existe aceite não revogado da versão atual |
| `acceptedAt` | instante desse aceite; `null` se `accepted` for falso |
| `lastAcceptedVersion` | versão do aceite não revogado mais recente, de qualquer versão; `null` se não houver. Diferente da atual: a interface avisa que o texto mudou |

- **PUT:** `noticeVersion` diferente da atual dá 409 `consent.notice_outdated` com a versão atual em `noticeVersion`. Havendo aceite ativo da versão atual, devolve-o sem alterar `acceptedAt`; senão insere uma linha. Corrida entre dois PUT cai na unicidade parcial e é relida como sucesso.
- **DELETE:** `UPDATE ia_trainner.user_consents SET revoked_at = @now WHERE owner_sub = @ownerSub AND purpose = 'gemini' AND revoked_at IS NULL`.

## Persistência

Tabela `ia_trainner.user_consents` ([banco-de-dados](banco-de-dados.md)): cada aceite é uma linha; a revogação só preenche `revoked_at`, preservando o histórico. Não se grava IP, agente do navegador nem outro dado além do necessário.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid | PK, UUID v7 |
| `owner_sub` | varchar(255) | dono |
| `organization_id` | varchar(64) null | organização do token |
| `purpose` | varchar(32) | `gemini` |
| `notice_version` | varchar(32) | id versionado do texto aceito |
| `accepted_at` | timestamptz | instante do aceite |
| `revoked_at` | timestamptz null | instante da revogação |

Consulta de vigência, igual na API e no Worker:

```sql
SELECT EXISTS (
  SELECT 1 FROM ia_trainner.user_consents
  WHERE owner_sub = @ownerSub AND purpose = 'gemini'
    AND notice_version = @currentVersion AND revoked_at IS NULL);
```

## Interface

- `/app/documentos`: sem consentimento vigente, o aviso aparece antes da área de envio, com "Aceitar e continuar"; o envio fica desabilitado até o aceite. Com `lastAcceptedVersion` antiga, o aviso começa por "O aviso foi atualizado".
- `/app/perfil`: estado do consentimento, data do aceite em `America/Sao_Paulo`, "Ler aviso" e "Revogar consentimento" com confirmação que explica os efeitos.
