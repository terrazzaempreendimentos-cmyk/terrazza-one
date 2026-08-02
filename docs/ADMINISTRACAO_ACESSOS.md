# Administração, usuários e acessos

O Auth User representa a identidade técnica em `auth.users`; `usuarios_perfis` representa o acesso à aplicação; `pessoas` representa a identidade comercial. A relação Auth → Pessoa é opcional, explícita e nunca é inferida por nome, e-mail, telefone ou metadata.

## Sprint 3D2

Administrador ativo é o único papel autorizado a listar usuários e criar ou atualizar perfis de usuários que já existem no Auth. Convites e criação de Auth User não fazem parte desta sprint. O MVP mantém um único papel por usuário.

Perfis podem ser criados, ativados, inativados e associados opcionalmente a uma Pessoa existente. Não existe exclusão física. O último administrador ativo não pode ser inativado nem perder o papel, e um administrador não pode inativar a si próprio ou retirar seu próprio papel administrativo. Alterações usam fotografia `updated_at` e trava transacional global.

Cada alteração válida grava um registro em `usuarios_acessos_auditoria` e um evento genérico na Timeline. O histórico não armazena e-mail, nome, tokens, payloads ou motivos livres. A Timeline global permite leitura a administrador e gestor; corretor e atendimento não têm acesso global. Eventos contextuais continuam nos módulos.

As RPCs `listar_usuarios_acessos()` e `salvar_usuario_acesso(...)` são `SECURITY DEFINER`, server-side, com `search_path` fixo e execução somente para `authenticated`; a autorização interna continua obrigatória. Não há INSERT/UPDATE/DELETE direto do cliente.

Não há convite, redefinição administrativa de senha, sincronização automática com papéis comerciais ou interface nesta sprint. A Sprint 3D3 poderá criar a área administrativa e seus formulários.
