# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O Terrazza CRM é usado internamente pela equipe da operação imobiliária, com quatro perfis de acesso:

- **Administrador:** governa usuários, permissões, configurações e toda a operação.
- **Gestor:** acompanha e conduz a operação comercial e imobiliária de forma ampla.
- **Corretor:** trabalha sua carteira atribuída ou relacionada, conforme as regras de ownership de cada módulo.
- **Atendimento:** atua na entrada, qualificação e continuidade do atendimento comercial dentro das permissões concedidas.

## Product Purpose

Centralizar a operação imobiliária da Terrazza em um único sistema, reunindo leads, imóveis, pessoas, negócios, atendimentos, atividades, documentos e apoio comercial por inteligência artificial.

O produto deve permitir que a equipe acompanhe o histórico e o estado de cada relacionamento, coordene responsabilidades e conduza o trabalho desde a captação e qualificação até a negociação e os processos posteriores. Sucesso significa reduzir a fragmentação operacional e manter pessoas e automações trabalhando sobre o mesmo contexto confiável.

## Positioning

O Terrazza CRM combina a gestão operacional imobiliária com uma camada de inteligência comercial integrada ao próprio fluxo de trabalho. A IA não é uma experiência isolada: ela qualifica contexto, prepara handoffs para a equipe humana e se conecta aos registros e processos do CRM respeitando papéis, permissões e rastreabilidade.

## Operating Context

- Aplicação interna acessada pelo navegador e organizada em um dashboard por módulos.
- Operação baseada em cadastros relacionados de Pessoas, Imóveis, Leads, Atendimentos, Negócios, Atividades e Documentos.
- Funil comercial para Leads e Negócios, com responsáveis, etapas e estados operacionais.
- Distribuição e reatribuição de Leads por roleta, preservando ações exclusivas de gestão.
- Catálogo de Imóveis compartilhado, com restrições de alteração por responsabilidade quando aplicável.
- Checklists e arquivos vinculados a Imóveis e Negócios, com download tratado como permissão mais sensível do que a simples visualização cadastral.
- Integrações servidor-a-servidor podem captar eventos externos, enquanto a timeline mantém registros genéricos e evita copiar conteúdo pessoal desnecessário.
- Convites, recuperação e definição de senha usam os fluxos de autenticação do Supabase.

## Capabilities and Constraints

- Stack existente: Next.js 16, React 19, TypeScript, Supabase e Tailwind CSS, com hospedagem na Vercel.
- Supabase fornece autenticação, banco PostgreSQL, Row Level Security, RPCs transacionais e Storage privado.
- A matriz de permissões em `lib/auth/permissions.ts` define as capacidades dos papéis Administrador, Gestor, Corretor e Atendimento.
- Autorizações sensíveis devem ser verificadas no servidor e reforçadas por RLS; ocultar controles na interface não é suficiente.
- O papel Corretor pode ter acesso limitado por ownership, usando a Pessoa vinculada ao seu perfil. A ausência desse vínculo deve falhar de forma fechada.
- Administrador e Gestor mantêm a visão operacional ampla nos módulos em que isso foi definido como regra de produto.
- Escritas de histórico sensível devem ocorrer por RPC transacional e não devem reproduzir texto livre, credenciais ou payloads brutos.
- Chaves de `service_role` e segredos de integrações são exclusivamente server-side e nunca podem usar prefixo público.
- Documentos ficam em bucket privado e exigem autorização própria para leitura, envio e download.
- Algumas áreas permanecem em evolução, incluindo integrações externas, IA para WhatsApp e expansão gradual de ownership entre módulos.

## Brand Commitments

- Nome do produto: **Terrazza CRM**.
- Marca visual existente em `public/terrazza-logo.png`.
- A linguagem da interface é português do Brasil e deve ser direta, profissional e adequada a uma operação imobiliária.
- Terminologia operacional existente — como Lead, Imóvel, Pessoa, Atendimento, Negócio, Corretor, Gestor, roleta e handoff — deve permanecer consistente entre interface, código e banco de dados.

## Evidence on Hand

- Implementação funcional e contratos de acesso presentes em `app/`, `components/`, `lib/` e `supabase/sql/`.
- Matriz de papéis e permissões em `lib/auth/permissions.ts`.
- Logo oficial disponível em `public/terrazza-logo.png`.
- Conhecimento comercial e imobiliário interno em `lib/ia/` e `lib/uce/`, incluindo fluxos, especialistas, roteiros e referências territoriais.
- Não há, no repositório, depoimentos, estudos de caso, métricas públicas ou alegações comerciais validadas que futuras interfaces possam inventar ou apresentar como prova.

## Product Principles

1. **Uma operação, um contexto:** os módulos devem compartilhar dados e histórico sem criar fontes concorrentes de verdade.
2. **Permissão explícita e defesa em profundidade:** cada ação deve respeitar papel, ownership e RLS, falhando de forma segura quando o vínculo necessário não existir.
3. **IA a serviço do trabalho humano:** automações devem qualificar, organizar e preparar a continuidade pela equipe, preservando supervisão e rastreabilidade.
4. **Privacidade por padrão:** dados pessoais, documentos e conversas recebem o menor nível de exposição necessário para executar a tarefa.
5. **Evolução sem quebrar a operação:** mudanças de schema e integrações devem preservar compatibilidade, ser revisáveis e entrar em produção de forma controlada.
