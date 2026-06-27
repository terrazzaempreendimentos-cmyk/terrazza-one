# UCE — Unita Cognitive Engine

UCE e a fundacao cognitiva que passa a sustentar a IA Comercial da Terrazza sem depender, nesta fase, de OpenAI, WhatsApp, Vista ou qualquer API externa.

## Objetivo

Criar um motor modular capaz de interpretar respostas curtas, preservar contexto, corrigir informacoes, gerar hipoteses comerciais, calcular score e preparar briefing progressivo.

## Estrutura

- `lib/uce/core`: tipos centrais e `processUCE`.
- `lib/uce/interpreters`: interpretadores contextual e temporal.
- `lib/uce/flow`: decisao da proxima pergunta.
- `lib/uce/memory`: correcoes e preservacao de memoria.
- `lib/uce/inference`: regras de hipoteses comerciais.
- `lib/uce/score`: score e temperatura.
- `lib/uce/briefing`: briefing estruturado.
- `lib/uce/domain`: dominios suportados.
- `lib/uce/personas` e `lib/uce/commercial`: fundacoes para especializacao futura.

## Fluxo

Mensagem do usuario  
↓  
Interpretador contextual  
↓  
Interpretador temporal  
↓  
Memoria e correcoes  
↓  
Fluxo inteligente  
↓  
Inferencias comerciais  
↓  
Score  
↓  
Briefing  
↓  
Adapter legado para o simulador

## Compatibilidade

O motor antigo em `lib/ia/motor` continua disponivel. A ponte inicial fica em:

- `lib/ia/motor/adapter.ts`
- `lib/ia/motor/turno.ts`

Assim, o simulador pode evoluir para UCE sem quebrar a interface visual e sem refatorar o CRM inteiro.

## Dominios futuros

A UCE nasce com foco em `real_estate`, mas sua estrutura ja prepara dominios como:

- leiloes;
- seguros;
- juridico;
- generico.

Nesta sprint, apenas o dominio imobiliario esta operacional.
