import { IPmsIntegrationProvider, PmsProperty, PmsUnit, PmsResident, PmsLease, PmsWorkOrder, PmsVendor, PmsDocument, PmsFinancialSummary } from '../pms-interface';
import { YardiApiClient } from './client';
import { YardiSyncManager } from './sync';
import * as mappers from './mappers';
import { YardiProperty, YardiUnit, YardiResident, YardiLease, YardiWorkOrder, YardiVendor, YardiDocument, YardiFinancialSummary } from './types';
import { YardiApiError, YardiMappingError } from './errors';

export class YardiIntegrationProvider implements IPmsIntegrationProvider {
  public readonly providerName = 'Yardi Voyager';
  private client: YardiApiClient;
  private syncManager: YardiSyncManager;

  constructor(client: YardiApiClient, syncManager: YardiSyncManager) {
    this.client = client;
    this.syncManager = syncManager;
  }

  // =====================================================================
  // PROPIEDADES Y UNIDADES
  // =====================================================================

  public async syncProperty(property: Omit<PmsProperty, 'externalId'>): Promise<PmsProperty> {
    const payload = mappers.mapPropertyToYardi(property);
    let externalCode = await this.syncManager.getExternalCode(property.id, 'property');
    let response: YardiProperty;

    try {
      if (externalCode) {
        // La propiedad ya existe en Yardi, se realiza una actualización (PUT)
        response = await this.client.post<YardiProperty>(`/properties/${externalCode}`, payload);
      } else {
        // Es una propiedad nueva, se crea en Yardi (POST)
        response = await this.client.post<YardiProperty>('/properties', payload);
        externalCode = response.PropertyCode;
        if (!externalCode) {
          throw new YardiMappingError('Yardi no retornó un PropertyCode válido al crear la propiedad.');
        }
        await this.syncManager.saveMapping(property.id, externalCode, 'property', 'synced');
      }

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'property',
        internalId: property.id,
        externalCode,
        operation: externalCode ? 'update' : 'create',
        status: 'success',
        payload,
        responsePayload: response,
      });

      return mappers.mapYardiToProperty(response, property.id);
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'property',
        internalId: property.id,
        externalCode: externalCode || undefined,
        operation: externalCode ? 'update' : 'create',
        status: 'failure',
        payload,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public async getProperty(externalId: string): Promise<PmsProperty | null> {
    try {
      const response = await this.client.get<YardiProperty>(`/properties/${externalId}`);
      if (!response) return null;
      // En una consulta directa, asumimos un UUID vacío o buscamos en mappings
      return mappers.mapYardiToProperty(response, '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (err instanceof YardiApiError && err.statusCode === 404) return null;
      throw err;
    }
  }

  public async listProperties(): Promise<PmsProperty[]> {
    const response = await this.client.get<YardiProperty[]>('/properties');
    return response.map((p) => mappers.mapYardiToProperty(p, '00000000-0000-0000-0000-000000000000'));
  }

  public async syncUnit(unit: Omit<PmsUnit, 'externalId'>): Promise<PmsUnit> {
    const payload = mappers.mapUnitToYardi(unit);
    let externalCode = await this.syncManager.getExternalCode(unit.id, 'unit');
    let response: YardiUnit;

    try {
      if (externalCode) {
        response = await this.client.post<YardiUnit>(`/units/${externalCode}`, payload);
      } else {
        response = await this.client.post<YardiUnit>('/units', payload);
        externalCode = response.UnitCode;
        if (!externalCode) {
          throw new YardiMappingError('Yardi no retornó un UnitCode válido al crear la unidad.');
        }
        await this.syncManager.saveMapping(unit.id, externalCode, 'unit', 'synced');
      }

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'unit',
        internalId: unit.id,
        externalCode,
        operation: externalCode ? 'update' : 'create',
        status: 'success',
        payload,
        responsePayload: response,
      });

      return mappers.mapYardiToUnit(response, unit.id);
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'unit',
        internalId: unit.id,
        externalCode: externalCode || undefined,
        operation: externalCode ? 'update' : 'create',
        status: 'failure',
        payload,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public async getUnit(externalId: string): Promise<PmsUnit | null> {
    try {
      const response = await this.client.get<YardiUnit>(`/units/${externalId}`);
      if (!response) return null;
      return mappers.mapYardiToUnit(response, '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (err instanceof YardiApiError && err.statusCode === 404) return null;
      throw err;
    }
  }

  // =====================================================================
  // RESIDENTES E INQUILINOS
  // =====================================================================

  public async syncResident(resident: Omit<PmsResident, 'externalId'>): Promise<PmsResident> {
    // Para Yardi necesitamos códigos de propiedad y unidad externos.
    // En este diseño base, los obtenemos asumiendo valores mock o consultando mapeos si estuvieran vinculados.
    const propertyCode = 'prop_vancouver_01';
    const unitCode = 'u101';
    const payload = mappers.mapResidentToYardi(resident, propertyCode, unitCode);
    let externalCode = await this.syncManager.getExternalCode(resident.id, 'resident');
    let response: YardiResident;

    try {
      if (externalCode) {
        response = await this.client.post<YardiResident>(`/residents/${externalCode}`, payload);
      } else {
        response = await this.client.post<YardiResident>('/residents', payload);
        externalCode = response.TenantCode;
        if (!externalCode) {
          throw new YardiMappingError('Yardi no retornó un TenantCode válido al registrar el residente.');
        }
        await this.syncManager.saveMapping(resident.id, externalCode, 'resident', 'synced');
      }

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'resident',
        internalId: resident.id,
        externalCode,
        operation: externalCode ? 'update' : 'create',
        status: 'success',
        payload,
        responsePayload: response,
      });

      return mappers.mapYardiToResident(response, resident.id);
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'resident',
        internalId: resident.id,
        externalCode: externalCode || undefined,
        operation: externalCode ? 'update' : 'create',
        status: 'failure',
        payload,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public async getResident(externalId: string): Promise<PmsResident | null> {
    try {
      const response = await this.client.get<YardiResident>(`/residents/${externalId}`);
      if (!response) return null;
      return mappers.mapYardiToResident(response, '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (err instanceof YardiApiError && err.statusCode === 404) return null;
      throw err;
    }
  }

  // =====================================================================
  // CONTRATOS Y ARRENDAMIENTOS (LEASES)
  // =====================================================================

  public async syncLease(lease: Omit<PmsLease, 'externalId'>): Promise<PmsLease> {
    const payload = mappers.mapLeaseToYardi(lease);
    let externalCode = await this.syncManager.getExternalCode(lease.id, 'lease');
    let response: YardiLease;

    try {
      if (externalCode) {
        response = await this.client.post<YardiLease>(`/leases/${externalCode}`, payload);
      } else {
        // Para crear un arrendamiento en Yardi, requerimos la propiedad asociada
        const mappedPayload = {
          ...payload,
          PropertyCode: 'prop_vancouver_01', // Valor de demostración
        };
        response = await this.client.post<YardiLease>('/leases', mappedPayload);
        externalCode = response.LeaseID;
        if (!externalCode) {
          throw new YardiMappingError('Yardi no retornó un LeaseID válido al registrar el contrato.');
        }
        await this.syncManager.saveMapping(lease.id, externalCode, 'lease', 'synced');
      }

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'lease',
        internalId: lease.id,
        externalCode,
        operation: externalCode ? 'update' : 'create',
        status: 'success',
        payload,
        responsePayload: response,
      });

      return mappers.mapYardiToLease(response, lease.id);
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'lease',
        internalId: lease.id,
        externalCode: externalCode || undefined,
        operation: externalCode ? 'update' : 'create',
        status: 'failure',
        payload,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public async getLease(externalId: string): Promise<PmsLease | null> {
    try {
      const response = await this.client.get<YardiLease>(`/leases/${externalId}`);
      if (!response) return null;
      return mappers.mapYardiToLease(response, '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (err instanceof YardiApiError && err.statusCode === 404) return null;
      throw err;
    }
  }

  // =====================================================================
  // MANTENIMIENTO Y ÓRDENES DE TRABAJO
  // =====================================================================

  public async syncWorkOrder(workOrder: Omit<PmsWorkOrder, 'externalId'>): Promise<PmsWorkOrder> {
    const payload = mappers.mapWorkOrderToYardi(workOrder);
    let externalCode = await this.syncManager.getExternalCode(workOrder.id, 'work_order');
    let response: YardiWorkOrder;

    try {
      if (externalCode) {
        response = await this.client.post<YardiWorkOrder>(`/workorders/${externalCode}`, payload);
      } else {
        response = await this.client.post<YardiWorkOrder>('/workorders', payload);
        externalCode = response.WorkOrderNumber;
        if (!externalCode) {
          throw new YardiMappingError('Yardi no retornó un número de orden de trabajo válido.');
        }
        await this.syncManager.saveMapping(workOrder.id, externalCode, 'work_order', 'synced');
      }

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'work_order',
        internalId: workOrder.id,
        externalCode,
        operation: externalCode ? 'update' : 'create',
        status: 'success',
        payload,
        responsePayload: response,
      });

      return mappers.mapYardiToWorkOrder(response, workOrder.id);
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'work_order',
        internalId: workOrder.id,
        externalCode: externalCode || undefined,
        operation: externalCode ? 'update' : 'create',
        status: 'failure',
        payload,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public async getWorkOrder(externalId: string): Promise<PmsWorkOrder | null> {
    try {
      const response = await this.client.get<YardiWorkOrder>(`/workorders/${externalId}`);
      if (!response) return null;
      return mappers.mapYardiToWorkOrder(response, '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (err instanceof YardiApiError && err.statusCode === 404) return null;
      throw err;
    }
  }

  public async listWorkOrders(propertyExternalId: string): Promise<PmsWorkOrder[]> {
    const response = await this.client.get<YardiWorkOrder[]>('/workorders', { propertyCode: propertyExternalId });
    return response.map((wo) => mappers.mapYardiToWorkOrder(wo, '00000000-0000-0000-0000-000000000000'));
  }

  // =====================================================================
  // PROVEEDORES
  // =====================================================================

  public async syncVendor(vendor: Omit<PmsVendor, 'externalId'>): Promise<PmsVendor> {
    const payload = mappers.mapVendorToYardi(vendor);
    let externalCode = await this.syncManager.getExternalCode(vendor.id, 'vendor');
    let response: YardiVendor;

    try {
      if (externalCode) {
        response = await this.client.post<YardiVendor>(`/vendors/${externalCode}`, payload);
      } else {
        response = await this.client.post<YardiVendor>('/vendors', payload);
        externalCode = response.VendorCode;
        if (!externalCode) {
          throw new YardiMappingError('Yardi no retornó un VendorCode válido al crear el proveedor.');
        }
        await this.syncManager.saveMapping(vendor.id, externalCode, 'vendor', 'synced');
      }

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'vendor',
        internalId: vendor.id,
        externalCode,
        operation: externalCode ? 'update' : 'create',
        status: 'success',
        payload,
        responsePayload: response,
      });

      return mappers.mapYardiToVendor(response, vendor.id);
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'vendor',
        internalId: vendor.id,
        externalCode: externalCode || undefined,
        operation: externalCode ? 'update' : 'create',
        status: 'failure',
        payload,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public async getVendor(externalId: string): Promise<PmsVendor | null> {
    try {
      const response = await this.client.get<YardiVendor>(`/vendors/${externalId}`);
      if (!response) return null;
      return mappers.mapYardiToVendor(response, '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (err instanceof YardiApiError && err.statusCode === 404) return null;
      throw err;
    }
  }

  // =====================================================================
  // DOCUMENTOS
  // =====================================================================

  public async uploadDocument(document: Omit<PmsDocument, 'externalId'>): Promise<PmsDocument> {
    const payload = mappers.mapDocumentToYardi(document);
    let response: YardiDocument;

    try {
      // Yardi usualmente acepta archivos adjuntos binarios via Base64 en sus endpoints de documentos
      const documentPayload = {
        ...payload,
        Base64Content: 'MOCK_BASE64_FILE_CONTENT', // En producción se cargaría el binario real
      };

      response = await this.client.post<YardiDocument>('/documents', documentPayload);
      const externalCode = response.AttachmentID;
      
      if (!externalCode) {
        throw new YardiMappingError('Yardi no retornó un AttachmentID válido al subir el documento.');
      }

      await this.syncManager.saveMapping(document.id, externalCode, 'document', 'synced');

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'document',
        internalId: document.id,
        externalCode,
        operation: 'create',
        status: 'success',
        payload,
        responsePayload: response,
      });

      return mappers.mapYardiToDocument(response, document.id);
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'document',
        internalId: document.id,
        operation: 'create',
        status: 'failure',
        payload,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public async listDocuments(entityType: string, entityExternalId: string): Promise<PmsDocument[]> {
    const response = await this.client.get<YardiDocument[]>('/documents', {
      entityType,
      entityKey: entityExternalId,
    });
    return response.map((doc) => mappers.mapYardiToDocument(doc, '00000000-0000-0000-0000-000000000000'));
  }

  // =====================================================================
  // DATOS FINANCIEROS (FUTURO-LISTO)
  // =====================================================================

  public async getFinancialSummary(leaseExternalId: string): Promise<PmsFinancialSummary> {
    const response = await this.client.get<YardiFinancialSummary>(`/financials/${leaseExternalId}`);
    
    // Mapeo directo al formato genérico
    return {
      residentExternalId: response.TenantCode,
      leaseExternalId: response.LeaseID,
      outstandingBalance: response.CurrentBalance,
      lastPaymentAmount: response.LastPaymentAmount,
      lastPaymentDate: response.LastPaymentDate,
      recentTransactions: response.Transactions.map((t) => ({
        id: t.TransactionID,
        date: t.PostDate,
        description: t.Description,
        amount: Math.abs(t.Amount),
        type: t.TransactionType.toLowerCase() as 'charge' | 'payment' | 'credit',
      })),
    };
  }

  public async postPayment(payment: {
    leaseExternalId: string;
    amount: number;
    paymentDate: string;
    referenceNumber: string;
    paymentMethod: string;
  }): Promise<{ success: boolean; externalTransactionId: string }> {
    try {
      const response = await this.client.post<{ TransactionID: string }>(
        `/financials/${payment.leaseExternalId}/payments`,
        {
          Amount: payment.amount,
          PaymentDate: payment.paymentDate,
          ReferenceNumber: payment.referenceNumber,
          PaymentMethod: payment.paymentMethod,
        }
      );

      await this.client.logSync({
        direction: 'outbound',
        entityType: 'financial',
        operation: 'post_payment',
        status: 'success',
        payload: payment,
        responsePayload: response,
      });

      return {
        success: true,
        externalTransactionId: response.TransactionID,
      };
    } catch (err: any) {
      await this.client.logSync({
        direction: 'outbound',
        entityType: 'financial',
        operation: 'post_payment',
        status: 'failure',
        payload: payment,
        errorMessage: err.message,
      });
      throw err;
    }
  }
}
