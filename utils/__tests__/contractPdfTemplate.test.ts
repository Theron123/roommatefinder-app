import { generateContractHTML, getContractTypeLabel, getOptionalClauseLabel } from '../contractPdfTemplate';

describe('contractPdfTemplate', () => {
  const mockContractData = {
    id: '12345678-abcd-ef01-2345-6789abcdef01',
    type: 'roommate_agreement',
    status: 'active',
    effective_date: '2026-08-01',
    termination_date: '2027-08-01',
    initiator: { name: 'Carlos Arrendador' },
    contract_participants: [
      { profiles: { name: 'María Inquilina' } }
    ],
    listings: {
      title: 'Apartamento Moderno San José',
      address: 'Avenida Central, San José, Costa Rica',
      property_type: 'Habitación Privada en Condominio',
      bedrooms: 2,
      bathrooms: 2,
      description: 'Apartamento amplio cerca de universidades y comercio.'
    },
    clauses: {
      rent: { amount: 850, currency: 'USD', due_day: 5, late_fee: 45, payment_method: 'Transferencia bancaria' },
      security_deposit: { amount: 850, return_days: 15 },
      pets: { allowed: true },
      smoking: { allowed: false },
      visitors: { overnight_allowed: true, max_nights: 3 },
      noise: { quiet_hours_start: '22:00', quiet_hours_end: '07:00' },
      cleaning: { schedule: 'weekly' }
    },
    selected_custom_clauses: ['no_subletting', 'parking_included']
  };

  test('generateContractHTML creates 3 distinct page sections', () => {
    const html = generateContractHTML(mockContractData, 'active', 'es');
    const pageMatches = html.match(/<div class="pdf-page"/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches?.length).toBe(3);
  });

  test('generateContractHTML contains all mandatory sections and no undefined or null strings', () => {
    const html = generateContractHTML(mockContractData, 'active', 'es');
    
    expect(html).toContain('INFORMACIÓN DE LAS PARTES CONTRATANTES');
    expect(html).toContain('1. INFORMACIÓN DEL INMUEBLE Y PROPIEDAD');
    expect(html).toContain('2. CONDICIONES DEL ARRENDAMIENTO');
    expect(html).toContain('3. OBLIGACIONES Y CLÁUSULAS DEL CONTRATO');
    expect(html).toContain('4. DISPOSICIONES ESPECIALES Y RESCISIÓN');
    expect(html).toContain('FIRMAS DE LAS PARTES Y ACEPTACIÓN LEGAL');
    expect(html).toContain('CERTIFICADO DIGITAL DE INTEGRIDAD Y AUDITORÍA SHA-256');

    expect(html).toContain('Carlos Arrendador');
    expect(html).toContain('María Inquilina');
    expect(html).toContain('Apartamento Moderno San José');
    expect(html).toContain('$850 USD');

    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
    expect(html).not.toContain('[object Object]');
  });

  test('getOptionalClauseLabel returns expected values', () => {
    expect(getOptionalClauseLabel('no_subletting', 'es')).toBe('Sin subarrendamiento');
    expect(getOptionalClauseLabel('no_subletting', 'en')).toBe('No subletting allowed');
  });

  test('getContractTypeLabel returns localized contract title', () => {
    expect(getContractTypeLabel('roommate_agreement', 'es')).toBe('Acuerdo Privado de Roommate y Co-Living');
    expect(getContractTypeLabel('rental_agreement', 'en')).toBe('Residential Lease Agreement');
  });
});
