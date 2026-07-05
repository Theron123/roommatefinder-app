/**
 * Tipos y modelos de datos específicos de Yardi Voyager.
 * Basado en las especificaciones de interfaces SaaS Select de Yardi (Guest Card, Resident, Work Order e interfaces financieras).
 */

export interface YardiProperty {
  PropertyCode: string;          // Clave única en Yardi (ej. "prop_vancouver_01")
  PropertyName: string;
  AddressInfo: {
    Address1: string;
    Address2?: string;
    City: string;
    State: string;
    PostalCode: string;
    Country: string;             // Ej. "CA" o "Canada"
  };
  PropertyType?: string;         // "Residential", "Commercial"
  Status: 'Active' | 'Inactive';
}

export interface YardiUnit {
  UnitCode: string;              // Clave única en Yardi
  PropertyCode: string;          // Clave de propiedad asociada
  UnitName: string;              // Número/Nombre del apartamento
  Status: 'Vacant' | 'Occupied' | 'Notice_To_Vacate' | 'Down';
  Bedrooms: number;
  Bathrooms: number;
  RentRange?: {
    MinRent: number;
    MaxRent: number;
  };
  SquareFeet?: number;
}

export interface YardiResident {
  TenantCode: string;            // Clave única en Yardi (ej. "t0001842")
  PropertyCode: string;
  UnitCode: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Status: 'Applicant' | 'Current' | 'Past' | 'Notice' | 'Evicted';
  LeaseStartDate: string;        // ISO YYYY-MM-DD
  LeaseEndDate: string | null;   // ISO YYYY-MM-DD
}

export interface YardiLease {
  LeaseID: string;               // Identificador de contrato en Yardi
  TenantCode: string;
  PropertyCode: string;
  UnitCode: string;
  StartDate: string;
  EndDate: string | null;
  MonthlyRent: number;
  SecurityDeposit: number;
  Status: 'Pending' | 'Active' | 'Terminated' | 'Expired';
  BillingDayOfMonth: number;     // Por defecto suele ser 1
}

export interface YardiWorkOrder {
  WorkOrderNumber: string;       // ID de orden de trabajo en Yardi
  PropertyCode: string;
  UnitCode: string;
  TenantCode: string;            // Residente solicitante
  ProblemDescription: string;
  CategoryCode: string;          // Mapeo Yardi (ej. "PLUM" para plomería)
  CategoryDescription: string;
  Priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  Status: 'New' | 'Assigned' | 'In_Progress' | 'Completed' | 'Cancelled';
  VendorCode?: string;           // Proveedor externo asignado
  DateCreated: string;           // ISO YYYY-MM-DD HH:MM:SS
  DateCompleted?: string;        // ISO YYYY-MM-DD HH:MM:SS
  TechnicianNotes?: string;
}

export interface YardiVendor {
  VendorCode: string;            // Código único en Yardi
  VendorName: string;
  ContactName?: string;
  AddressInfo?: {
    Address1: string;
    City: string;
    State: string;
    PostalCode: string;
  };
  Phone?: string;
  Email?: string;
  TaxID?: string;
  Status: 'Active' | 'Inactive';
}

export interface YardiDocument {
  AttachmentID: string;          // ID de adjunto en Yardi
  EntityType: 'Tenant' | 'Lease' | 'Property' | 'WorkOrder';
  EntityKey: string;             // External Code correspondiente (ej. TenantCode)
  FileName: string;
  FileType: string;              // "pdf", "jpg", etc.
  FileUrl?: string;              // URL pública en el almacenamiento de Yardi
  Base64Content?: string;        // Para subidas a la API SOAP/REST
  DateCreated: string;
}

export interface YardiTransaction {
  TransactionID: string;
  PostDate: string;              // YYYY-MM-DD
  Description: string;
  Amount: number;                // Positivo para cargos, negativo para créditos/pagos
  TransactionType: 'Charge' | 'Payment' | 'Credit' | 'Prepayment';
  ChargeCode?: string;           // Mapeo de cuentas Yardi (ej. "rent", "late_fee")
}

export interface YardiFinancialSummary {
  TenantCode: string;
  LeaseID: string;
  CurrentBalance: number;        // Saldo pendiente
  LastPaymentAmount?: number;
  LastPaymentDate?: string;
  Transactions: YardiTransaction[];
}

/**
 * Representa los esquemas de respuestas comunes de los endpoints SOAP de Yardi.
 */
export interface YardiSoapResponse<T = any> {
  Envelope: {
    Body: {
      [responseMethodName: string]: {
        Result: {
          Status: 'Success' | 'Error';
          ErrorCode?: string;
          ErrorMessage?: string;
          Data?: T;
        };
      };
    };
  };
}
