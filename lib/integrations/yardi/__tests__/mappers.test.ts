import {
  mapPropertyToYardi, mapYardiToProperty,
  mapUnitToYardi, mapYardiToUnit,
  mapResidentToYardi, mapYardiToResident,
  mapLeaseToYardi, mapYardiToLease,
  mapWorkOrderToYardi, mapYardiToWorkOrder,
  mapVendorToYardi, mapYardiToVendor,
  mapDocumentToYardi, mapYardiToDocument,
} from '../mappers';
import { YardiMappingError } from '../errors';
import { YardiProperty, YardiUnit, YardiResident, YardiLease, YardiWorkOrder, YardiVendor, YardiDocument } from '../types';

describe('mapPropertyToYardi', () => {
  it('toma el primer segmento de la dirección como Address1 y usa defaults cuando faltan datos', () => {
    const result = mapPropertyToYardi({
      id: '1', name: 'Casa Azul', address: '123 Main St, Springfield',
      city: '', stateProvince: '', postalCode: '', country: '', status: 'active',
    });
    expect(result.AddressInfo.Address1).toBe('123 Main St');
    expect(result.AddressInfo.City).toBe('Desconocida');
    expect(result.AddressInfo.Country).toBe('Canada');
    expect(result.Status).toBe('Active');
  });

  it('mapea status inactive a Inactive', () => {
    const result = mapPropertyToYardi({
      id: '1', name: 'X', address: 'Calle 1', city: 'SJ', stateProvince: 'SJ',
      postalCode: '10101', country: 'Costa Rica', status: 'inactive',
    });
    expect(result.Status).toBe('Inactive');
  });
});

describe('mapYardiToProperty', () => {
  const validYardiProp: YardiProperty = {
    PropertyCode: 'P-1', PropertyName: 'Casa Azul',
    AddressInfo: { Address1: '123 Main St', City: 'NY', State: 'NY', PostalCode: '10001', Country: 'USA' },
    Status: 'Active',
  };

  it('lanza YardiMappingError si falta PropertyCode', () => {
    expect(() => mapYardiToProperty({ ...validYardiProp, PropertyCode: '' }, 'internal-1')).toThrow(YardiMappingError);
  });

  it('arma la dirección completa uniendo los segmentos con coma', () => {
    const result = mapYardiToProperty(validYardiProp, 'internal-1');
    expect(result.address).toBe('123 Main St, NY, NY, 10001');
    expect(result.externalId).toBe('P-1');
    expect(result.status).toBe('active');
  });
});

describe('mapUnitToYardi', () => {
  it('mapea vacant/occupied directo y cualquier otro estado a Down', () => {
    const base = { id: 'unit-1', propertyExternalId: 'P-1', unitNumber: '101', bedRooms: 1, bathRooms: 1, rentAmount: 500 };
    expect(mapUnitToYardi({ ...base, status: 'vacant' }).Status).toBe('Vacant');
    expect(mapUnitToYardi({ ...base, status: 'occupied' }).Status).toBe('Occupied');
    expect(mapUnitToYardi({ ...base, status: 'maintenance' }).Status).toBe('Down');
  });
});

describe('mapYardiToUnit', () => {
  const validYardiUnit: YardiUnit = {
    UnitCode: 'U-1', PropertyCode: 'P-1', UnitName: '101', Status: 'Vacant',
    Bedrooms: 2, Bathrooms: 1, RentRange: { MinRent: 750, MaxRent: 900 },
  };

  it('lanza YardiMappingError si falta UnitCode', () => {
    expect(() => mapYardiToUnit({ ...validYardiUnit, UnitCode: '' }, 'i-1')).toThrow(YardiMappingError);
  });

  it('usa 0 como renta si no viene RentRange', () => {
    const { RentRange, ...rest } = validYardiUnit;
    const result = mapYardiToUnit(rest as YardiUnit, 'i-1');
    expect(result.rentAmount).toBe(0);
  });
});

describe('mapResidentToYardi', () => {
  it('usa "N/A" como teléfono por defecto y mapea el status correctamente', () => {
    const result = mapResidentToYardi(
      { id: 'res-1', firstName: 'Ana', lastName: 'Perez', email: 'ana@x.com', phone: '', status: 'current' },
      'P-1', 'U-1'
    );
    expect(result.Phone).toBe('N/A');
    expect(result.Status).toBe('Current');
  });
});

describe('mapYardiToResident', () => {
  it('lanza YardiMappingError si falta TenantCode', () => {
    const invalid: YardiResident = {
      TenantCode: '', PropertyCode: 'P-1', UnitCode: 'U-1', FirstName: 'Ana', LastName: 'Perez',
      Email: 'a@x.com', Phone: 'N/A', Status: 'Current', LeaseStartDate: '2026-01-01', LeaseEndDate: null,
    };
    expect(() => mapYardiToResident(invalid, 'i-1')).toThrow(YardiMappingError);
  });
});

describe('mapLeaseToYardi / mapYardiToLease', () => {
  it('mapea el status de contrato en ambas direcciones', () => {
    const toYardi = mapLeaseToYardi({
      id: 'lease-1', residentExternalId: 'T-1', unitExternalId: 'U-1', startDate: '2026-01-01', endDate: '2027-01-01',
      monthlyRent: 800, securityDeposit: 800, status: 'active',
    });
    expect(toYardi.Status).toBe('Active');

    const back = mapYardiToLease({
      LeaseID: 'L-1', TenantCode: 'T-1', PropertyCode: 'P-1', UnitCode: 'U-1',
      StartDate: '2026-01-01', EndDate: '2027-01-01', MonthlyRent: 800, SecurityDeposit: 800,
      Status: 'Active', BillingDayOfMonth: 1,
    } as YardiLease, 'i-1');
    expect(back.status).toBe('active');
  });

  it('lanza YardiMappingError si falta LeaseID', () => {
    expect(() => mapYardiToLease({
      LeaseID: '', TenantCode: 'T-1', PropertyCode: 'P-1', UnitCode: 'U-1',
      StartDate: '2026-01-01', EndDate: null, MonthlyRent: 800, SecurityDeposit: 800,
      Status: 'Pending', BillingDayOfMonth: 1,
    } as YardiLease, 'i-1')).toThrow(YardiMappingError);
  });
});

describe('mapWorkOrderToYardi', () => {
  it('mapea prioridad/estado conocidos y cae a Medium/New si no reconoce el valor', () => {
    const base = {
      propertyExternalId: 'P-1', unitExternalId: 'U-1', tenantExternalId: 'T-1',
      category: 'plomería', description: 'Fuga de agua', createdAt: '2026-01-01',
    };
    const known = mapWorkOrderToYardi({ ...base, priority: 'high', status: 'assigned' } as any);
    expect(known.Priority).toBe('High');
    expect(known.Status).toBe('Assigned');

    const unknown = mapWorkOrderToYardi({ ...base, priority: 'urgentisimo', status: 'quien-sabe' } as any);
    expect(unknown.Priority).toBe('Medium');
    expect(unknown.Status).toBe('New');
  });

  it('arma CategoryCode con las primeras 4 letras de la categoría en mayúsculas', () => {
    const result = mapWorkOrderToYardi({
      propertyExternalId: 'P-1', unitExternalId: 'U-1', tenantExternalId: 'T-1',
      category: 'electricidad', description: 'x', createdAt: '2026-01-01',
      priority: 'low', status: 'new',
    } as any);
    expect(result.CategoryCode).toBe('ELEC');
  });
});

describe('mapYardiToWorkOrder', () => {
  const validWO: YardiWorkOrder = {
    WorkOrderNumber: 'WO-1', PropertyCode: 'P-1', UnitCode: 'U-1', TenantCode: 'T-1',
    ProblemDescription: 'Fuga', CategoryCode: 'PLUM', CategoryDescription: 'Plomería',
    Priority: 'High', Status: 'New', VendorCode: 'V-1', DateCreated: '2026-01-01',
  };

  it('lanza YardiMappingError si falta WorkOrderNumber', () => {
    expect(() => mapYardiToWorkOrder({ ...validWO, WorkOrderNumber: '' }, 'i-1')).toThrow(YardiMappingError);
  });

  it('usa "Mantenimiento General" si no viene CategoryDescription', () => {
    const { CategoryDescription, ...rest } = validWO;
    const result = mapYardiToWorkOrder(rest as YardiWorkOrder, 'i-1');
    expect(result.category).toBe('Mantenimiento General');
  });
});

describe('mapVendorToYardi / mapYardiToVendor', () => {
  it('mapea status y usa strings vacíos como fallback de contacto/email/teléfono', () => {
    const toYardi = mapVendorToYardi({ id: 'vendor-1', name: 'ACME', contactName: 'Bob', phone: '555', email: 'b@x.com', status: 'active' });
    expect(toYardi.Status).toBe('Active');

    const validVendor: YardiVendor = { VendorCode: 'V-1', VendorName: 'ACME', Status: 'Active' };
    const back = mapYardiToVendor(validVendor, 'i-1');
    expect(back.contactName).toBe('');
    expect(back.email).toBe('');
    expect(back.phone).toBe('');
    expect(back.status).toBe('active');
  });

  it('lanza YardiMappingError si falta VendorCode', () => {
    expect(() => mapYardiToVendor({ VendorCode: '', VendorName: 'ACME', Status: 'Active' }, 'i-1')).toThrow(YardiMappingError);
  });
});

describe('mapDocumentToYardi / mapYardiToDocument', () => {
  it('mapea entityType conocido y agrupa "unit" bajo Property', () => {
    const result = mapDocumentToYardi({
      id: 'doc-1', entityType: 'unit', entityExternalId: 'U-1', fileName: 'contrato.pdf',
      fileType: 'application/pdf', fileUrl: 'https://x/contrato.pdf', uploadedAt: '2026-01-01',
    });
    expect(result.EntityType).toBe('Property');
    expect(result.FileType).toBe('pdf');
  });

  it('lanza YardiMappingError si falta AttachmentID', () => {
    const invalid: YardiDocument = {
      AttachmentID: '', EntityType: 'Lease', EntityKey: 'L-1', FileName: 'a.pdf',
      FileType: 'pdf', FileUrl: 'https://x/a.pdf', DateCreated: '2026-01-01',
    };
    expect(() => mapYardiToDocument(invalid, 'i-1')).toThrow(YardiMappingError);
  });

  it('infiere el fileType interno: pdf -> application/pdf, cualquier otro -> image/jpeg', () => {
    const pdf = mapYardiToDocument({
      AttachmentID: 'A-1', EntityType: 'Property', EntityKey: 'P-1', FileName: 'a.pdf',
      FileType: 'pdf', FileUrl: 'https://x/a.pdf', DateCreated: '2026-01-01',
    }, 'i-1');
    expect(pdf.fileType).toBe('application/pdf');

    const img = mapYardiToDocument({
      AttachmentID: 'A-2', EntityType: 'Property', EntityKey: 'P-1', FileName: 'a.jpg',
      FileType: 'jpg', FileUrl: 'https://x/a.jpg', DateCreated: '2026-01-01',
    }, 'i-2');
    expect(img.fileType).toBe('image/jpeg');
  });
});
