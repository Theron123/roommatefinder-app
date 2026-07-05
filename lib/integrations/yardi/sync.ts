import { YardiApiClient } from './client';
import { YardiSyncConflictError, YardiMappingError } from './errors';

export type ConflictResolutionStrategy = 'PMS_WINS' | 'LOCAL_WINS' | 'MANUAL';

export interface EntityMappingRecord {
  id: string;
  companyConfigId: string;
  entityType: string;
  internalId: string;
  externalCode: string;
  syncStatus: 'synced' | 'failed' | 'pending';
  errorMessage?: string;
  lastSyncedAt?: string;
}

export class YardiSyncManager {
  private client: YardiApiClient;
  private companyConfigId?: string;
  // Fallback en memoria si las tablas de la BD aún no están creadas
  private static memoryMappings: Map<string, string> = new Map();

  constructor(client: YardiApiClient, companyConfigId?: string) {
    this.client = client;
    this.companyConfigId = companyConfigId;
  }

  /**
   * Obtiene la relación de ID local y código Yardi de la base de datos o fallback a memoria.
   */
  public async getExternalCode(internalId: string, entityType: string): Promise<string | null> {
    if (!this.companyConfigId) {
      return YardiSyncManager.memoryMappings.get(`${entityType}:${internalId}`) || null;
    }

    try {
      const { supabase } = require('../../supabase');
      const { data, error } = await (supabase as any)
        .from('pms_entity_mappings')
        .select('external_code')
        .eq('company_config_id', this.companyConfigId)
        .eq('entity_type', entityType)
        .eq('internal_id', internalId)
        .maybeSingle();

      if (error) {
        // Fallback a memoria si la tabla no existe o falla la consulta
        console.warn(`[YARDI SYNC MANAGER] Error al leer mapeo de BD, usando fallback en memoria: ${error.message}`);
        return YardiSyncManager.memoryMappings.get(`${entityType}:${internalId}`) || null;
      }

      return data?.external_code || null;
    } catch {
      return YardiSyncManager.memoryMappings.get(`${entityType}:${internalId}`) || null;
    }
  }

  /**
   * Registra el mapeo entre un ID local y un código externo en Supabase o memoria.
   */
  public async saveMapping(
    internalId: string,
    externalCode: string,
    entityType: string,
    status: 'synced' | 'failed' | 'pending' = 'synced',
    errorMessage?: string
  ): Promise<void> {
    const memoryKey = `${entityType}:${internalId}`;
    YardiSyncManager.memoryMappings.set(memoryKey, externalCode);

    if (!this.companyConfigId) {
      console.log(`[YARDI SYNC MANAGER] Mapeo guardado en memoria: ${memoryKey} -> ${externalCode}`);
      return;
    }

    try {
      const { supabase } = require('../../supabase');
      const mappingPayload = {
        company_config_id: this.companyConfigId,
        entity_type: entityType,
        internal_id: internalId,
        external_code: externalCode,
        sync_status: status,
        error_message: errorMessage || null,
        last_synced_at: new Date().toISOString(),
      };

      // Upsert basado en la clave de unicidad local
      const { error } = await (supabase as any)
        .from('pms_entity_mappings')
        .upsert(mappingPayload, {
          onConflict: 'company_config_id,entity_type,internal_id',
        });

      if (error) {
        console.warn(`[YARDI SYNC MANAGER] Fallo al guardar mapeo en base de datos: ${error.message}`);
      }
    } catch (e: any) {
      console.warn(`[YARDI SYNC MANAGER] Error al ejecutar upsert en base de datos: ${e.message}`);
    }
  }

  /**
   * Resuelve conflictos de sincronización cuando se detecta que los datos cambiaron en ambos extremos.
   */
  public resolveConflict<T = any>(
    internalId: string,
    externalCode: string,
    localData: T,
    externalData: T,
    strategy: ConflictResolutionStrategy = 'PMS_WINS'
  ): T {
    console.log(`[YARDI SYNC MANAGER] Resolviendo conflicto para ${internalId} (${externalCode}) con estrategia: ${strategy}`);
    
    switch (strategy) {
      case 'PMS_WINS':
        // Gana Yardi Voyager, se devuelven los datos del PMS para sobreescribir la base local
        return externalData;
      case 'LOCAL_WINS':
        // Gana la base local de la App, se devuelven los datos locales para actualizar el PMS
        return localData;
      case 'MANUAL':
      default:
        // Lanza un error controlado para ser encolado y resuelto por un administrador
        throw new YardiSyncConflictError(
          'Se requiere resolución manual para esta entidad.',
          internalId,
          externalCode,
          localData,
          externalData
        );
    }
  }

  /**
   * Procesa un webhook o evento entrante desde Yardi Voyager.
   * Por ejemplo, Yardi notifica que una orden de trabajo ha sido completada en su sistema.
   */
  public async handleYardiWebhook(event: {
    eventType: 'WORK_ORDER_COMPLETED' | 'LEASE_SIGNED' | 'RESIDENT_LEAVING';
    externalCode: string;
    payload: any;
  }): Promise<{ success: boolean; message: string }> {
    console.log(`[YARDI SYNC MANAGER] Evento Webhook recibido: ${event.eventType} para código: ${event.externalCode}`);
    
    // Registrar el log del webhook
    await this.client.logSync({
      direction: 'inbound',
      entityType: event.eventType.split('_')[0].toLowerCase(),
      externalCode: event.externalCode,
      operation: 'webhook',
      status: 'success',
      payload: event.payload,
    });

    switch (event.eventType) {
      case 'WORK_ORDER_COMPLETED':
        // En un caso real:
        // 1. Buscamos el internalId correspondiente usando getExternalCode de forma inversa o por consulta
        // 2. Actualizamos el estado en nuestra tabla local de órdenes de trabajo a 'completed'
        return {
          success: true,
          message: `Webhook de orden de trabajo completada procesado para YardiCode ${event.externalCode}`,
        };
      
      case 'LEASE_SIGNED':
        // 1. Buscamos contrato correspondiente
        // 2. Activamos contrato y creamos registro de inquilino
        return {
          success: true,
          message: `Webhook de contrato firmado procesado para YardiCode ${event.externalCode}`,
        };

      default:
        return {
          success: false,
          message: `Tipo de evento webhook no soportado: ${event.eventType}`,
        };
    }
  }

  /**
   * Simula una cola de tareas de sincronización asíncrona para segundo plano.
   */
  public async enqueueSyncTask(task: {
    entityType: string;
    internalId: string;
    operation: 'push' | 'pull';
  }): Promise<string> {
    const taskId = `sync-task-${Math.floor(100000 + Math.random() * 900000)}`;
    console.log(`[YARDI SYNC MANAGER] Tarea encolada [ID: ${taskId}] para sincronizar ${task.entityType}:${task.internalId} (${task.operation})`);
    
    // Simula ejecución en segundo plano diferida
    setTimeout(async () => {
      try {
        console.log(`[YARDI SYNC TASK RUNNING] Ejecutando tarea ${taskId} en segundo plano...`);
        // Aquí se llamaría a YardiIntegrationProvider para sincronizar la entidad correspondiente
      } catch (err: any) {
        console.error(`[YARDI SYNC TASK ERROR] Tarea ${taskId} falló:`, err.message);
      }
    }, 1000);

    return taskId;
  }
}
