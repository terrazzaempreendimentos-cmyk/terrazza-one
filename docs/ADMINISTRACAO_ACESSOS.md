# Administração, usuários e acessos

O Auth User representa a identidade técnica em `auth.users`; `usuarios_perfis` representa o acesso à aplicação; `pessoas` representa a identidade comercial. A relação Auth → Pessoa é opcional, explícita e nunca é inferida por nome, e-mail, telefone ou metadata.

## Sprint 3D2

Administrador ativo é o único papel autorizado a listar usuários e criar ou atualizar perfis de usuários que já existem no Auth. Convites e criação de Auth User não fazem parte desta sprint. O MVP mantém um único papel por usuário.

Perfis podem ser criados, ativados, inativados e associados opcionalmente a uma Pessoa existente. Não existe exclusão física. O último administrador ativo não pode ser inativado nem perder o papel, e um administrador não pode inativar a si próprio ou retirar seu próprio papel administrativo. Alterações usam fotografia `updated_at` e trava transacional global.

Cada alteração válida grava um registro em `usuarios_acessos_auditoria` e um evento genérico na Timeline. O histórico não armazena e-mail, nome, tokens, payloads ou motivos livres. A Timeline global permite leitura a administrador e gestor; corretor e atendimento não têm acesso global. Eventos contextuais continuam nos módulos.

As RPCs `listar_usuarios_acessos()` e `salvar_usuario_acesso(...)` são `SECURITY DEFINER`, server-side, com `search_path` fixo e execução somente para `authenticated`; a autorização interna continua obrigatória. Não há INSERT/UPDATE/DELETE direto do cliente.

Não há convite, redefinição administrativa de senha, sincronização automática com papéis comerciais ou interface nesta sprint. A Sprint 3D3 poderá criar a área administrativa e seus formulários.

## Convites e ativação

O convite usa cliente Supabase administrativo exclusivamente server-only e `SUPABASE_SERVICE_ROLE_KEY`, nunca uma variável `NEXT_PUBLIC_` e nunca um componente Client. `NEXT_PUBLIC_SITE_URL` define a origem canônica sem query string para `/auth/confirm`. O administrador escolhe papel, estado e Pessoa opcional; não define senha.

Após a confirmação, o convidado estabelece a própria senha em `/definir-senha`. O perfil ativo é exigido para entrar no CRM; sem perfil ou com perfil inativo, o usuário permanece em `/acesso-pendente`. Se o convite for enviado e a criação do perfil falhar, o usuário Auth não é apagado nem o convite repetido: o acesso permanece pendente para configuração manual.

Convites exigem que as URLs de produção estejam autorizadas no Supabase Auth, incluindo `/auth/confirm` e `/definir-senha`. Reenvio automático e criação de novos usuários fora deste fluxo permanecem pendentes.

### Configuração exata do template Invite user

O `redirectTo` enviado pelo servidor é exatamente:

`https://www.terrazzacrm.com.br/auth/confirm`

No painel Supabase, o template **Invite user** deve usar o link:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha">
  Aceitar convite
</a>
```

A rota aceita somente `type=invite`, valida `next` contra open redirect e, após `verifyOtp`, redireciona para `/definir-senha` sem expor o token.
