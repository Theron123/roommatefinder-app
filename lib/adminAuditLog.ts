import { supabase } from './supabase';

export type AdminAuditEntityType = 'user' | 'property' | 'contract';

// Shape compatible con los tipos locales que ya usaban las pantallas admin
// (AuditLog/PropertyAuditLog/ContractAuditLog) para no tener que tocar el JSX
// que los renderiza, solo de dónde vienen los datos.
export interface AdminAuditLogEntry {
  timestamp: string;
  action: string;
  adminName: string;
}

// Registra una acción administrativa en Supabase (admin_audit_log), asociada
// al admin autenticado actual.
export async function logAdminAction(
  entityType: AdminAuditEntityType,
  entityId: string,
  action: string
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const adminId = session?.user?.id;

    const { error } = await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      entity_type: entityType,
      entity_id: entityId,
      action,
    });

    if (error) console.error('Error registrando auditoría:', error);
  } catch (e) {
    console.error('Error registrando auditoría:', e);
  }
}

// Trae el historial de auditoría de una entidad (usuario/propiedad/contrato),
// con el nombre real del admin que hizo cada acción.
export async function fetchAdminAuditLog(
  entityType: AdminAuditEntityType,
  entityId: string
): Promise<AdminAuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('action, created_at, admin:admin_id(name)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando auditoría:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      timestamp: row.created_at,
      action: row.action,
      adminName: row.admin?.name || 'Admin',
    }));
  } catch (e) {
    console.error('Error cargando auditoría:', e);
    return [];
  }
}
