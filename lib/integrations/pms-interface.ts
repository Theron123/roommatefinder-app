/**
 * Interfaces genéricas para la integración con sistemas de gestión de propiedades (PMS).
 * Diseñado bajo principios SOLID para permitir el intercambio de proveedores (Yardi, Entrata, RealPage, etc.)
 */

export interface PmsProperty {
  id: string;             // ID interno (ej. UUID de listing o perfil)
  externalId: string;     // ID en el PMS (ej. PropertyCode de Yardi)
  name: string;
  address: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  status: 'active' | 'inactive';
}

export interface PmsUnit {
  id: string;             // ID interno
  externalId: string;     // ID en el PMS (ej. UnitCode de Yardi)
  propertyExternalId: string; // Relación con la propiedad
  unitNumber: string;
  bedRooms: number;
  bathRooms: number;
  rentAmount: number;
  status: 'vacant' | 'occupied' | 'maintenance';
}

export interface PmsResident {
  id: string;             // ID interno (perfil de usuario)
  externalId: string;     // ID en el PMS (ej. TenantCode de Yardi)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'applicant' | 'current' | 'past' | 'rejected';
}

export interface PmsLease {
  id: string;             // ID interno (contrato)
  externalId: string;     // ID en el PMS (ej. LeaseId de Yardi)
  unitExternalId: string;
  residentExternalId: string;
  startDate: string;      // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  monthlyRent: number;
  securityDeposit: number;
  status: 'pending' | 'active' | 'terminated' | 'expired';
}

export interface PmsWorkOrder {
  id: string;             // ID interno
  externalId: string;     // ID en el PMS (ej. WorkOrderNumber de Yardi)
  propertyExternalId: string;
  unitExternalId: string;
  tenantExternalId: string;
  category: string;       // Ej. Plomería, Electricidad
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  vendorExternalId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PmsVendor {
  id: string;
  externalId: string;     // ID en el PMS (ej. VendorCode de Yardi)
  name: string;
  contactName: string;
  email: string;
  phone: string;
  taxId?: string;
  status: 'active' | 'inactive';
}

export interface PmsDocument {
  id: string;
  externalId: string;     // ID en el PMS (ej. AttachmentId de Yardi)
  entityType: 'property' | 'unit' | 'tenant' | 'lease' | 'work_order';
  entityExternalId: string;
  fileName: string;
  fileType: string;       // Ej. application/pdf
  fileUrl: string;
  uploadedAt: string;
}

export interface PmsFinancialSummary {
  residentExternalId: string;
  leaseExternalId: string;
  outstandingBalance: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'charge' | 'payment' | 'credit';
  }>;
}

/**
 * Interfaz unificada para proveedores de PMS.
 * Cualquier PMS que se integre en el futuro debe implementar estos métodos.
 */
export interface IPmsIntegrationProvider {
  providerName: string;

  // Propiedades y Unidades
  syncProperty(property: Omit<PmsProperty, 'externalId'>): Promise<PmsProperty>;
  getProperty(externalId: string): Promise<PmsProperty | null>;
  listProperties(): Promise<PmsProperty[]>;
  
  syncUnit(unit: Omit<PmsUnit, 'externalId'>): Promise<PmsUnit>;
  getUnit(externalId: string): Promise<PmsUnit | null>;

  // Residentes e Inquilinos
  syncResident(resident: Omit<PmsResident, 'externalId'>): Promise<PmsResident>;
  getResident(externalId: string): Promise<PmsResident | null>;

  // Contratos y Arrendamientos (Leases)
  syncLease(lease: Omit<PmsLease, 'externalId'>): Promise<PmsLease>;
  getLease(externalId: string): Promise<PmsLease | null>;

  // Mantenimiento y Órdenes de Trabajo
  syncWorkOrder(workOrder: Omit<PmsWorkOrder, 'externalId'>): Promise<PmsWorkOrder>;
  getWorkOrder(externalId: string): Promise<PmsWorkOrder | null>;
  listWorkOrders(propertyExternalId: string): Promise<PmsWorkOrder[]>;

  // Proveedores
  syncVendor(vendor: Omit<PmsVendor, 'externalId'>): Promise<PmsVendor>;
  getVendor(externalId: string): Promise<PmsVendor | null>;

  // Documentos
  uploadDocument(document: Omit<PmsDocument, 'externalId'>): Promise<PmsDocument>;
  listDocuments(entityType: string, entityExternalId: string): Promise<PmsDocument[]>;

  // Datos Financieros (Lectura y envío de recibos)
  getFinancialSummary(leaseExternalId: string): Promise<PmsFinancialSummary>;
  postPayment(payment: {
    leaseExternalId: string;
    amount: number;
    paymentDate: string;
    referenceNumber: string;
    paymentMethod: string;
  }): Promise<{ success: boolean; externalTransactionId: string }>;
}
