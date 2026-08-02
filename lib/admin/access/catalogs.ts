export const ACCESS_ROLES = ["administrador", "gestor", "corretor", "atendimento"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];
export const ACCESS_AUDIT_OPERATIONS = ["perfil_criado", "perfil_atualizado", "perfil_ativado", "perfil_inativado", "papel_alterado", "pessoa_vinculada", "pessoa_desvinculada"] as const;
export type AccessAuditOperation = (typeof ACCESS_AUDIT_OPERATIONS)[number];
export const ACCESS_MESSAGES = ["Operacao nao autorizada.", "Usuario inexistente.", "Papel invalido.", "Pessoa inexistente.", "Pessoa ja vinculada.", "Perfil inexistente.", "Perfil atualizado por outra operacao.", "Voce nao pode inativar o proprio acesso.", "Voce nao pode alterar o proprio papel administrativo.", "O sistema deve manter pelo menos um administrador ativo.", "Estado de perfil invalido.", "Retorno inesperado.", "Falha ao listar acessos.", "Falha ao salvar acesso.", "Falha ao registrar auditoria de acesso.", "Falha ao registrar Timeline administrativa."] as const;
