# Workflow de desenvolvimento com Claude Code

O prompt completo está em [entregar-plataforma](../../.claude/skills/entregar-plataforma/SKILL.md), com [critérios de aceite por marco](../../.claude/skills/entregar-plataforma/references/marcos.md). Ele usa o formato de [skill de projeto do Claude Code](https://code.claude.com/docs/en/skills), disponível como comando `/entregar-plataforma`.

## Começar pelo acesso funcional

Abra o Claude Code na raiz física ou no alias do principal:

```sh
cd /Volumes/HDX/Dev/ia-trainner-platform
claude
```

Na conversa do Claude, execute:

```text
/entregar-plataforma acesso
```

Essa execução deve entregar o fluxo Entrar → ZITADEL → área autenticada → API .NET → publicação verificada. Concluir esse marco não significa que documentos, RAG e treinamento estejam prontos.

## Prompt para colar em uma sessão existente

```text
Trabalhe na IA Trainner a partir da raiz deste repositório. Leia e siga
.claude/skills/entregar-plataforma/SKILL.md com o argumento acesso, incluindo
os critérios de M1 em references/marcos.md, relativo à pasta dessa skill.

Quero uma entrega funcional: clicar em Entrar no domínio oficial, autenticar
no ZITADEL, acessar a área interna e consumir a API .NET com autorização real.
Implemente, teste, integre e entregue pelo GitHub Actions e Argo CD existentes,
dentro das permissões já concedidas. Não encerre somente com um plano ou outra
página de apresentação. Preserve alterações locais e mantenha os segredos no
Infisical. Registre evidências e pendências para retomada; não declare concluído
o que não foi verificado. Se houver bloqueio externo, peça apenas a informação
ou ação necessária e avance no trabalho independente.
```

## Retomar e avançar

| Comando dentro do Claude | Resultado esperado |
|---|---|
| `/entregar-plataforma status` | Inspeção sem alterações |
| `/entregar-plataforma continuar` | Retoma o primeiro marco incompleto a partir do progresso registrado |
| `/entregar-plataforma documentos` | Upload, persistência e processamento real |
| `/entregar-plataforma rag` | Embeddings, recuperação, chat e fontes |
| `/entregar-plataforma treinamento` | Agenda, GPU exclusiva, Job Python, avaliação e inferência |
| `/entregar-plataforma completo` | Executa os quatro marcos em ordem, com entrega verificável de cada um |

O registro `docs/operations/development-status.md` será criado na primeira execução de implementação. Ele distingue implementação local, publicação e verificação no ambiente. Se a sessão terminar antes do objetivo, `continuar` usa esse registro e confere o estado real antes de prosseguir.

O comando organiza o trabalho do Claude; não cria um agendamento nem substitui os workflows GitHub Actions. Esta configuração foi criada sem iniciar uma sessão de implementação do Claude ou disparar deploy de aplicação.
