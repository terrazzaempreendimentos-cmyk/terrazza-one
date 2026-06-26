# Terrazza One — Arquitetura do Produto

## Identidade

Terrazza One é o painel operacional da Terrazza Soluções Imobiliárias.

Terrazza CRM é o motor comercial inteligente da Terrazza One.

O objetivo do sistema não é substituir imediatamente ERPs imobiliários externos, como Vista ou OKE, mas criar uma camada própria de inteligência comercial, relacionamento, automação e gestão operacional.

## Princípios do Terrazza CRM

1. A IA nunca conversa diretamente com o Vista ou qualquer ERP externo.
   Todo fluxo passa pela camada Terrazza CRM/API Terrazza.

2. Todo lead nasce dentro da Terrazza CRM.
   O ERP externo recebe apenas leads qualificados, quando fizer sentido operacional.

3. A Terrazza One administra relacionamentos imobiliários.
   O centro do sistema é a jornada da pessoa: proprietário, inquilino, comprador, vendedor e corretor parceiro.

## Separação conceitual

### Terrazza One
Painel interno, dashboards, cadastros, operação, gestão e visualização.

### Terrazza CRM
Motor comercial inteligente: leads, kanban, IA WhatsApp, agenda inteligente, tarefas, follow-up, roleta, pipeline e inteligência comercial.

### ERP externo
Sistema especializado para administração, contratos, financeiro, boletos, portais e rotinas operacionais específicas.

## Pessoas

- Proprietários
- Inquilinos
- Compradores
- Vendedores
- Corretores
- Corretores parceiros
- Leads

## Atividades

- Tarefa
- Ligação
- Mensagem
- Visita
- Avaliação de imóvel
- Reunião
- Pendência documental
- Assinatura
- Entrega de chaves
- Follow-up

## Regra de ouro

Antes de construir qualquer tela, perguntar:

"Se eu fosse dono de uma imobiliária com 500 imóveis administrados, eu abriria essa tela todos os dias?"

Se a resposta for sim, a funcionalidade tem prioridade.
