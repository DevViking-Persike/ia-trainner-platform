# Testar treinamentos e modelos

A primeira configuração da plataforma produz um adapter LoRA para
`Qwen/Qwen2.5-0.5B-Instruct`. O adapter é um complemento dos pesos do modelo base.
A tela Modelos permite compará-lo com o modelo base em uma execução agendada;
selecioná-lo não o instala no chat Ollama.

## Preparar dados

Use o [arquivo sintético de exemplo](../../examples/training/synthetic-smoke.jsonl)
ou salve um arquivo UTF-8 com extensão `.jsonl`, contendo um objeto por linha:

```jsonl
{"instruction":"Qual é o código do projeto fictício Aurora?","input":"","output":"O código do projeto fictício Aurora é AUR-42."}
{"instruction":"Qual é a cor da caixa fictícia Boreal?","input":"","output":"A caixa fictícia Boreal é azul."}
{"instruction":"Quantas peças há no kit fictício Cedro?","input":"","output":"O kit fictício Cedro contém três peças."}
```

Os nomes das propriedades são exatamente `instruction`, `input` e `output`.
`input` pode ser omitido; as outras duas propriedades exigem texto não vazio.
Não inclua colchetes envolvendo o arquivo, linhas vazias, BOM ou campos extras.
O limite inicial é 32 MiB, 5.000 exemplos, 8.192 bytes UTF-8 por campo e
32.768 bytes por linha. Há também um limite de 1.024 tokens por exemplo já
formatado: o executor rejeita exemplos longos, sem cortar a resposta silenciosamente.

Esse arquivo serve para verificar o fluxo; três exemplos e poucos passos não
demonstram ganho de qualidade ou memorização confiável.

## Agendar e acompanhar

1. Abra **Treinamentos**, informe um nome e envie o JSONL. Os dados ficam privados
   na infraestrutura da plataforma; esse fluxo não envia o dataset ao Gemini.
2. Selecione os dados e a configuração disponível. Para começar, use poucos
   passos, respeitando o intervalo mostrado na tela.
3. Informe início e fim em horário de São Paulo, com a antecedência e a duração
   mínima informadas pelo catálogo. A janela reserva tempo de preparação, execução
   máxima e restauração; o trabalho pode terminar antes do fim da janela.
4. Acompanhe o estado. A GPU da P7 é exclusiva e o chat local pode ficar
   indisponível durante o trabalho. Cancelar solicita a parada e a restauração;
   não significa liberação imediata da GPU.
5. Se falhar ou for cancelado, abra o detalhe e solicite nova execução com uma
   nova janela. O trabalho anterior permanece no histórico.

## Comparar o modelo

Quando uma versão estiver disponível em **Modelos**, selecione-a explicitamente.
Informe a mesma instrução que deseja comparar e uma janela para a avaliação.
O Job executa o modelo base e o adapter com a mesma entrada; as respostas e
métricas aparecem depois da conclusão. A avaliação também usa a GPU exclusiva
e pode ser cancelada.

O download do adapter exige a sessão do proprietário. O arquivo contém o adapter
PEFT e seus metadados, não um modelo GGUF pronto para instalar no Ollama.

## Documentos e OCR

**Documentos** é um fluxo separado: recebe arquivos, extrai texto e pode enviar
páginas digitalizadas ao Gemini após o aceite do aviso. Um documento processado
não é transformado automaticamente em dataset de treinamento nesta entrega.
Enquanto o faturamento Gemini não estiver confirmado, use somente material
sintético ou público que você possa compartilhar, conforme o aviso apresentado.

O estado de implementação, publicação e testes no ambiente está em
[development-status.md](development-status.md); testes CPU não comprovam a
execução real na P7.
