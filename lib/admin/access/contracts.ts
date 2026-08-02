import { ACCESS_AUDIT_OPERATIONS, ACCESS_MESSAGES, ACCESS_ROLES, type AccessAuditOperation, type AccessRole } from "./catalogs";

export type SafeUserAccess = Readonly<{ user_id: string; email: string | null; auth_created_at: string; last_sign_in_at: string | null; perfil_id: string | null; papel: AccessRole | null; ativo: boolean | null; pessoa_id: string | null; pessoa_nome: string | null; perfil_created_at: string | null; perfil_updated_at: string | null }>;
export type SaveUserAccessInput = Readonly<{ p_user_id: string; p_papel: AccessRole; p_ativo: boolean; p_pessoa_id?: string | null; p_updated_at_esperado?: string | null }>;
export type SaveUserAccessResult = Readonly<{ perfil_id: string; user_id: string; papel: AccessRole; ativo: boolean; pessoa_id: string | null; created_at: string; updated_at: string; operacao: AccessAuditOperation }>;
export { ACCESS_AUDIT_OPERATIONS, ACCESS_MESSAGES, ACCESS_ROLES };
export type { AccessAuditOperation, AccessRole };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isAccessUuid(value: unknown): value is string { return typeof value === "string" && UUID.test(value); }
export function isAccessTimestamp(value: unknown): value is string { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
export function isAccessRole(value: unknown): value is AccessRole { return typeof value === "string" && (ACCESS_ROLES as readonly string[]).includes(value); }
export function isAccessAuditOperation(value: unknown): value is AccessAuditOperation { return typeof value === "string" && (ACCESS_AUDIT_OPERATIONS as readonly string[]).includes(value); }
export function isSafeUserAccess(value: unknown): value is SafeUserAccess { return !!value && typeof value === "object" && isAccessUuid((value as SafeUserAccess).user_id) && ((value as SafeUserAccess).papel === null || isAccessRole((value as SafeUserAccess).papel)); }
export function isSaveUserAccessResult(value: unknown): value is SaveUserAccessResult { return !!value && typeof value === "object" && isAccessUuid((value as SaveUserAccessResult).perfil_id) && isAccessUuid((value as SaveUserAccessResult).user_id) && isAccessRole((value as SaveUserAccessResult).papel) && typeof (value as SaveUserAccessResult).ativo === "boolean" && isAccessAuditOperation((value as SaveUserAccessResult).operacao) && isAccessTimestamp((value as SaveUserAccessResult).created_at) && isAccessTimestamp((value as SaveUserAccessResult).updated_at); }
