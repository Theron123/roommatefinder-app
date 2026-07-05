import { PmsProperty, PmsUnit, PmsResident, PmsLease, PmsWorkOrder, PmsVendor, PmsDocument } from '../pms-interface';
import { YardiProperty, YardiUnit, YardiResident, YardiLease, YardiWorkOrder, YardiVendor, YardiDocument } from './types';
import { YardiMappingError } from './errors';

/**
 * Mapeadores de datos bidireccionales entre los modelos de la aplicación local
 * (incluidos los modelos genéricos del PMS-Interface) y los esquemas específicos de Yardi Voyager.
 */

// =====================================================================
// MAPEO DE PROPIEDADES Y UNIDADES
// =====================================================================

export function mapPropertyToYardi(pmsProp: Omit<PmsProperty, 'externalId'>): Omit<YardiProperty, 'PropertyCode'> {
  // Extrae y limpia la dirección
  const addressParts = pmsProp.address.split(',');
  const address1 = addressParts[0]?.trim() || 'Dirección Desconocida';
  
  return {
    PropertyName: pmsProp.name,
    AddressInfo: {
      Address1: address1,
      City: pmsProp.city || 'Desconocida',
      State: pmsProp.stateProvince || 'Desconocida',
      PostalCode: pmsProp.postalCode || 'Desconocido',
      Country: pmsProp.country || 'Canada',
    },
    Status: pmsProp.status === 'active' ? 'Active' : 'Inactive',
  };
}

export function mapYardiToProperty(yardiProp: YardiProperty, internalId: string): PmsProperty {
  if (!yardiProp.PropertyCode) {
    throw new YardiMappingError('PropertyCode de Yardi es obligatorio para mapear a propiedad interna.');
  }

  const addr = yardiProp.AddressInfo;
  const fullAddress = [addr.Address1, addr.Address2, addr.City, addr.State, addr.PostalCode]
    .filter(Boolean)
    .join(', ');

  return {
    id: internalId,
    externalId: yardiProp.PropertyCode,
    name: yardiProp.PropertyName,
    address: fullAddress,
    city: addr.City,
    stateProvince: addr.State,
    postalCode: addr.PostalCode,
    country: addr.Country || 'Canada',
    status: yardiProp.Status === 'Active' ? 'active' : 'inactive',
  };
}

export function mapUnitToYardi(pmsUnit: Omit<PmsUnit, 'externalId'>): Omit<YardiUnit, 'UnitCode'> {
  return {
    PropertyCode: pmsUnit.propertyExternalId,
    UnitName: pmsUnit.unitNumber,
    Status: pmsUnit.status === 'vacant' ? 'Vacant' : pmsUnit.status === 'occupied' ? 'Occupied' : 'Down',
    Bedrooms: pmsUnit.bedRooms,
    Bathrooms: pmsUnit.bathRooms,
    RentRange: {
      MinRent: pmsUnit.rentAmount,
      MaxRent: pmsUnit.rentAmount,
    },
  };
}

export function mapYardiToUnit(yardiUnit: YardiUnit, internalId: string): PmsUnit {
  if (!yardiUnit.UnitCode) {
    throw new YardiMappingError('UnitCode de Yardi es obligatorio para mapear a unidad interna.');
  }

  return {
    id: internalId,
    externalId: yardiUnit.UnitCode,
    propertyExternalId: yardiUnit.PropertyCode,
    unitNumber: yardiUnit.UnitName,
    bedRooms: yardiUnit.Bedrooms,
    bathRooms: yardiUnit.Bathrooms,
    rentAmount: yardiUnit.RentRange?.MinRent || 0,
    status: yardiUnit.Status === 'Vacant' ? 'vacant' : yardiUnit.Status === 'Occupied' ? 'occupied' : 'maintenance',
  };
}

// =====================================================================
// MAPEO DE RESIDENTES / INQUILINOS
// =====================================================================

export function mapResidentToYardi(pmsRes: Omit<PmsResident, 'externalId'>, propertyCode: string, unitCode: string): Omit<YardiResident, 'TenantCode'> {
  return {
    PropertyCode: propertyCode,
    UnitCode: unitCode,
    FirstName: pmsRes.firstName,
    LastName: pmsRes.lastName,
    Email: pmsRes.email,
    Phone: pmsRes.phone || 'N/A',
    Status: pmsRes.status === 'current' ? 'Current' : pmsRes.status === 'applicant' ? 'Applicant' : 'Past',
    LeaseStartDate: new Date().toISOString().split('T')[0], // Valor por defecto
    LeaseEndDate: null,
  };
}

export function mapYardiToResident(yardiRes: YardiResident, internalId: string): PmsResident {
  if (!yardiRes.TenantCode) {
    throw new YardiMappingError('TenantCode de Yardi es obligatorio para mapear a residente interno.');
  }

  return {
    id: internalId,
    externalId: yardiRes.TenantCode,
    firstName: yardiRes.FirstName,
    lastName: yardiRes.LastName,
    email: yardiRes.Email,
    phone: yardiRes.Phone,
    status: yardiRes.Status === 'Current' ? 'current' : yardiRes.Status === 'Applicant' ? 'applicant' : 'past',
  };
}

// =====================================================================
// MAPEO DE CONTRATOS Y ARRENDAMIENTOS (LEASES)
// =====================================================================

export function mapLeaseToYardi(pmsLease: Omit<PmsLease, 'externalId'>): Omit<YardiLease, 'LeaseID'> {
  return {
    TenantCode: pmsLease.residentExternalId,
    PropertyCode: '', // Se deducirá a nivel de servicio
    UnitCode: pmsLease.unitExternalId,
    StartDate: pmsLease.startDate,
    EndDate: pmsLease.endDate,
    MonthlyRent: pmsLease.monthlyRent,
    SecurityDeposit: pmsLease.securityDeposit,
    Status: pmsLease.status === 'active' ? 'Active' : pmsLease.status === 'pending' ? 'Pending' : 'Terminated',
    BillingDayOfMonth: 1,
  };
}

export function mapYardiToLease(yardiLease: YardiLease, internalId: string): PmsLease {
  if (!yardiLease.LeaseID) {
    throw new YardiMappingError('LeaseID de Yardi es obligatorio para mapear a contrato interno.');
  }

  return {
    id: internalId,
    externalId: yardiLease.LeaseID,
    unitExternalId: yardiLease.UnitCode,
    residentExternalId: yardiLease.TenantCode,
    startDate: yardiLease.StartDate,
    endDate: yardiLease.EndDate,
    monthlyRent: yardiLease.MonthlyRent,
    securityDeposit: yardiLease.SecurityDeposit,
    status: yardiLease.Status === 'Active' ? 'active' : yardiLease.Status === 'Pending' ? 'pending' : 'terminated',
  };
}

// =====================================================================
// MAPEO DE ÓRDENES DE TRABAJO Y PROVEEDORES
// =====================================================================

export function mapWorkOrderToYardi(pmsWO: Omit<PmsWorkOrder, 'externalId'>): Omit<YardiWorkOrder, 'WorkOrderNumber'> {
  // Mapear prioridad interna a la esperada por Yardi
  const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Emergency'> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    emergency: 'Emergency',
  };

  // Mapear estado interno al esperado por Yardi
  const statusMap: Record<string, 'New' | 'Assigned' | 'In_Progress' | 'Completed' | 'Cancelled'> = {
    new: 'New',
    assigned: 'Assigned',
    in_progress: 'In_Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return {
    PropertyCode: pmsWO.propertyExternalId,
    UnitCode: pmsWO.unitExternalId,
    TenantCode: pmsWO.tenantExternalId,
    ProblemDescription: pmsWO.description,
    CategoryCode: pmsWO.category.toUpperCase().substring(0, 4), // Ej. PLUM, ELEC
    CategoryDescription: pmsWO.category,
    Priority: priorityMap[pmsWO.priority] || 'Medium',
    Status: statusMap[pmsWO.status] || 'New',
    VendorCode: pmsWO.vendorExternalId,
    DateCreated: pmsWO.createdAt,
    DateCompleted: pmsWO.completedAt,
  };
}

export function mapYardiToWorkOrder(yardiWO: YardiWorkOrder, internalId: string): PmsWorkOrder {
  if (!yardiWO.WorkOrderNumber) {
    throw new YardiMappingError('WorkOrderNumber de Yardi es obligatorio para mapear a orden de trabajo.');
  }

  const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'emergency'> = {
    'Low': 'low',
    'Medium': 'medium',
    'High': 'high',
    'Emergency': 'emergency',
  };

  const statusMap: Record<string, 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'> = {
    'New': 'new',
    'Assigned': 'assigned',
    'In_Progress': 'in_progress',
    'Completed': 'completed',
    'Cancelled': 'cancelled',
  };

  return {
    id: internalId,
    externalId: yardiWO.WorkOrderNumber,
    propertyExternalId: yardiWO.PropertyCode,
    unitExternalId: yardiWO.UnitCode,
    tenantExternalId: yardiWO.TenantCode,
    category: yardiWO.CategoryDescription || 'Mantenimiento General',
    description: yardiWO.ProblemDescription,
    priority: priorityMap[yardiWO.Priority] || 'medium',
    status: statusMap[yardiWO.Status] || 'new',
    vendorExternalId: yardiWO.VendorCode,
    createdAt: yardiWO.DateCreated,
    completedAt: yardiWO.DateCompleted,
  };
}

export function mapVendorToYardi(pmsVendor: Omit<PmsVendor, 'externalId'>): Omit<YardiVendor, 'VendorCode'> {
  return {
    VendorName: pmsVendor.name,
    ContactName: pmsVendor.contactName,
    Phone: pmsVendor.phone,
    Email: pmsVendor.email,
    TaxID: pmsVendor.taxId,
    Status: pmsVendor.status === 'active' ? 'Active' : 'Inactive',
  };
}

export function mapYardiToVendor(yardiVendor: YardiVendor, internalId: string): PmsVendor {
  if (!yardiVendor.VendorCode) {
    throw new YardiMappingError('VendorCode de Yardi es obligatorio para mapear a proveedor.');
  }

  return {
    id: internalId,
    externalId: yardiVendor.VendorCode,
    name: yardiVendor.VendorName,
    contactName: yardiVendor.ContactName || '',
    email: yardiVendor.Email || '',
    phone: yardiVendor.Phone || '',
    taxId: yardiVendor.TaxID,
    status: yardiVendor.Status === 'Active' ? 'active' : 'inactive',
  };
}

// =====================================================================
// MAPEO DE DOCUMENTOS
// =====================================================================

export function mapDocumentToYardi(pmsDoc: Omit<PmsDocument, 'externalId'>): Omit<YardiDocument, 'AttachmentID'> {
  const entityTypeMap: Record<string, 'Tenant' | 'Lease' | 'Property' | 'WorkOrder'> = {
    property: 'Property',
    unit: 'Property', // Yardi suele agrupar los adjuntos a nivel de propiedad
    tenant: 'Tenant',
    lease: 'Lease',
    work_order: 'WorkOrder',
  };

  const fileExt = pmsDoc.fileName.split('.').pop() || 'pdf';

  return {
    EntityType: entityTypeMap[pmsDoc.entityType] || 'Lease',
    EntityKey: pmsDoc.entityExternalId,
    FileName: pmsDoc.fileName,
    FileType: fileExt,
    FileUrl: pmsDoc.fileUrl,
    DateCreated: pmsDoc.uploadedAt,
  };
}

export function mapYardiToDocument(yardiDoc: YardiDocument, internalId: string): PmsDocument {
  if (!yardiDoc.AttachmentID) {
    throw new YardiMappingError('AttachmentID de Yardi es obligatorio para mapear a documento.');
  }

  const entityTypeMap: Record<string, 'property' | 'tenant' | 'lease' | 'work_order'> = {
    'Property': 'property',
    'Tenant': 'tenant',
    'Lease': 'lease',
    'WorkOrder': 'work_order',
  };

  return {
    id: internalId,
    externalId: yardiDoc.AttachmentID,
    entityType: entityTypeMap[yardiDoc.EntityType] || 'lease',
    entityExternalId: yardiDoc.EntityKey,
    fileName: yardiDoc.FileName,
    fileType: yardiDoc.FileType === 'pdf' ? 'application/pdf' : 'image/jpeg', // Mapeo simple
    fileUrl: yardiDoc.FileUrl || '',
    uploadedAt: yardiDoc.DateCreated,
  };
}
