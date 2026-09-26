# Consentimento para o uso do Google Gemini

Decisão do titular em 25/09/2026: documentos podem ir ao Gemini para OCR (M2), embeddings e respostas (M3), com aviso claro e consentimento registrado por usuário e versionado. A P7 é último recurso e nunca mistura espaços vetoriais. Regras comuns no [README](README.md); códigos em [erros](erros.md).

## Regras

- Todo envio ao Gemini exige consentimento vigente no momento do envio: aceite não revogado da versão atual do aviso, consultado pelo `owner_sub` gravado na linha do documento, nunca pelo evento. Vale para cada chamada de OCR, inclusive retentativas, para cada lote de embeddings do M3 (indexação, reindexação e carga de documentos antigos) e para cada pergunta do M3.
- Upload e reprocessamento também exigem consentimento vigente na API; sem ele, 409 `consent.required`.
- Sem consentimento vigente, o OCR é interrompido antes da próxima página: o documento vai a `failed` com `document.consent_required` (reprocessável) e nenhuma página restante é enviada.
- A exigência vale para todos os tipos, inclusive TXT, MD e PDF com camada de texto, que chegam a `ready` no M2 sem chamar o Gemini: no M3 todo documento pronto gera embeddings no Gemini. O indexador do M3 não envia documento de dono sem consentimento vigente; o documento fica com indexação `consent_required` (estado a acrescentar no contrato do M3) e volta à fila depois de um novo aceite.
- Revogar bloqueia, a partir desse instante, todo envio novo: páginas ainda não enviadas de um OCR em andamento, indexação e perguntas. Não apaga documentos. O que já foi enviado ao Google não pode ser recolhido; o usuário pode excluir seus documentos a qualquer momento, em definitivo.
- Texto do aviso alterado é uma nova versão: todos precisam aceitar de novo, e nada é enviado até lá.

## Nível da Gemini API

Os termos da Gemini API tratam o conteúdo conforme o nível da chave. No nível pago (projeto do Google Cloud com faturamento ativo), o Google não usa prompts e respostas para melhorar seus produtos e guarda registros por tempo limitado, só para detectar abuso e cumprir exigências legais. No nível gratuito, o Google usa o conteúdo para melhorar e desenvolver produtos e tecnologias de aprendizado de máquina, e revisores humanos podem lê-lo. Nos dois, o conteúdo pode ser processado ou guardado em qualquer país onde o Google tenha instalações.

- Ativação de 26/09/2026: enquanto o nível das duas chaves (`sdk-gemini-1` e `sdk-gemini-2`, ver [configuracao](configuracao.md)) não estiver confirmado, usar a variante conservadora do nível gratuito. Isso não afirma que as chaves são gratuitas ou pagas. O aceite explícito por usuário permanece obrigatório. O parágrafo pago abaixo só pode ser usado após confirmação de ambas.
- Se alguma chave for do nível gratuito, ela sai da configuração ou o aviso é publicado com a variante do parágrafo 2, que cobre o pior caso.
- Trocar uma chave por outra de nível diferente do declarado no aviso exige nova versão do aviso antes da troca.

## Aviso

O texto vive no backend (`IATrainner.Application`), imutável por versão; API e Worker usam a mesma versão atual, definida em código (sem configuração). O Angular exibe `title` e `paragraphs` como texto puro, sem HTML. Versão inicial `gemini-v1` publicada com a variante conservadora abaixo; nenhuma aceitação existia no banco antes desta ativação. A variante paga fica como referência para uma futura versão após confirmação:

> **Uso do Google Gemini no processamento dos seus documentos**
>
> 1. Para ler imagens e PDFs digitalizados, a IA Trainner envia essas páginas ao Google Gemini, serviço de IA do Google. Quando as conversas sobre documentos forem liberadas, o texto dos seus documentos e as suas perguntas também serão enviados ao Gemini para indexação e respostas.
> 2. O envio usa a conta paga da plataforma na Gemini API. Nessa modalidade, o Google não usa o conteúdo enviado nem as respostas para melhorar seus produtos e guarda registros por tempo limitado, só para detectar abusos e cumprir exigências legais. O conteúdo é processado em servidores do Google que podem ficar fora do Brasil: é uma transferência internacional de dados.
> 3. Envie apenas documentos que você pode compartilhar com terceiros. Enquanto o envio puder usar o nível gratuito, não envie dados pessoais, informações sensíveis ou material confidencial.
> 4. Seus arquivos e o texto extraído ficam na infraestrutura da IA Trainner, isolados por conta.
> 5. Você pode revogar este consentimento no seu perfil. A partir da revogação, nada mais é enviado ao Gemini: nem as páginas que faltarem de um processamento em andamento, nem textos para indexação, nem perguntas. O que já foi enviado ao Google não pode ser recolhido. Excluir um documento o remove em definitivo da plataforma.

Variante vigente do parágrafo 2, obrigatória se alguma chave for do nível gratuito ou seu nível ainda não tiver sido confirmado:

> 2. O envio pode usar uma chave do nível gratuito da Gemini API. Nessa modalidade, o Google pode usar o conteúdo enviado e as respostas para melhorar e desenvolver seus produtos e tecnologias de aprendizado de máquina, e revisores humanos podem ler esse conteúdo. O conteúdo é processado em servidores do Google que podem ficar fora do Brasil: é uma transferência internacional de dados.

Referência conferida em 26/09/2026: [termos da Gemini API](https://ai.google.dev/gemini-api/terms), seções de uso dos dados nos níveis gratuito e pago. Os testes de aceite usam apenas arquivos sintéticos, sem dados pessoais.

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

Consulta de vigência, igual na API e no Worker (no Worker, `@ownerSub` é o `owner_sub` da linha do documento):

```sql
SELECT EXISTS (
  SELECT 1 FROM ia_trainner.user_consents
  WHERE owner_sub = @ownerSub AND purpose = 'gemini'
    AND notice_version = @currentVersion AND revoked_at IS NULL);
```

## Interface

- `/app/documentos`: sem consentimento vigente, o aviso aparece antes da área de envio, com "Aceitar e continuar"; o envio fica desabilitado até o aceite. Com `lastAcceptedVersion` antiga, o aviso começa por "O aviso foi atualizado".
- `/app/perfil`: estado do consentimento, data do aceite em `America/Sao_Paulo`, "Ler aviso" e "Revogar consentimento" com confirmação que explica os efeitos.
