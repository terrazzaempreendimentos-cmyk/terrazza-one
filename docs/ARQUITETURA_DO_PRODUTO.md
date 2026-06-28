# Arquitetura do Produto Terrazza One

Este documento registra a arquitetura oficial de navegacao do Terrazza One e a
responsabilidade de cada modulo do portal.

## Principios

Principio no 1:

"A tecnologia pode ser complexa por dentro.
A experiencia do usuario deve ser simples por fora."

O UCE e o cerebro do ecossistema. Ele concentra a inteligencia operacional,
organiza conhecimento, memoria, correspondencias e analises, mas a interface deve
apresentar isso de forma clara para a equipe.

## Arquitetura oficial do menu

A sidebar principal e organizada em seis grupos:

1. Dashboard
2. Cadastros
3. CRM
4. UCE
5. Inteligencia
6. Administracao

## Responsabilidade de cada modulo

### Dashboard

Responsabilidade: visao geral.

O Dashboard concentra a leitura inicial do portal e deve servir como ponto de
entrada para indicadores resumidos, alertas e atalhos principais.

### Cadastros

Responsabilidade: dados mestres.

Cadastros agrupa as bases estruturais usadas pela operacao: proprietarios,
inquilinos, imoveis, corretores e, futuramente, parceiros. Este modulo deve
guardar entidades essenciais do negocio, sem misturar rotinas operacionais do
CRM.

### CRM

Responsabilidade: operacao.

CRM agrupa as ferramentas de rotina comercial e operacional: leads, kanban,
agenda inteligente, roleta inteligente, timeline e, futuramente, atendimentos.
O objetivo e apoiar o trabalho diario da equipe comercial.

### UCE

Responsabilidade: inteligencia operacional.

UCE concentra a camada cognitiva do Terrazza One: IA Comercial, UCE Conhecimento,
UCE Memoria, UCE Correspondencias e UCE Analytics. Este modulo organiza o
cerebro operacional do ecossistema, separando inteligencia de execucao
comercial.

### Inteligencia

Responsabilidade: indicadores e analises.

Inteligencia sera o espaco de dashboards executivos, indicadores, conversao,
performance comercial e relatorios. Seu foco e leitura analitica e tomada de
decisao.

### Administracao

Responsabilidade: configuracao do sistema.

Administracao concentra configuracoes, usuarios, perfis e integracoes. Tambem
abriga o Laboratorio UCE, area interna para simulacao, diagnostico, logs, testes
OpenAI e guardrails.

## Fluxo de navegacao

O fluxo de navegacao deve seguir a responsabilidade de cada modulo:

- Dashboard: entender rapidamente o estado geral.
- Cadastros: consultar e manter dados mestres.
- CRM: executar rotinas comerciais e acompanhar operacao.
- UCE: configurar e consultar inteligencia operacional.
- Inteligencia: analisar desempenho e resultados.
- Administracao: ajustar sistema, acessos, integracoes e laboratorio interno.

## Estrutura final da sidebar

### Dashboard

- Visao Geral

### Cadastros

- Proprietarios
- Inquilinos
- Imoveis
- Corretores
- Parceiros: em desenvolvimento

### CRM

- Leads
- Kanban
- Agenda Inteligente
- Roleta Inteligente
- Timeline
- Atendimentos: em desenvolvimento

### UCE

- IA Comercial
- UCE Conhecimento
- UCE Memoria
- UCE Correspondencias: em desenvolvimento
- UCE Analytics: em desenvolvimento

### Inteligencia

- Dashboard Executivo: em breve
- Indicadores: em breve
- Conversao: em breve
- Performance Comercial: em breve
- Relatorios: em breve

### Administracao

- Configuracoes
- Usuarios: em desenvolvimento
- Perfis: em desenvolvimento
- Integracoes: em desenvolvimento

Laboratorio UCE:

- Simulador IA
- Diagnostico: em desenvolvimento
- Logs: em desenvolvimento
- Testes OpenAI: em desenvolvimento
- Guardrails: em desenvolvimento
