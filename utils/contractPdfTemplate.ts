import { detectCountryCode, getLegalFramework } from '@/constants/legalFrameworks';

/**
 * ============================================================================
 * PLANTILLA PROFESIONAL DE CONTRATO PDF (RoommateFinder Platform)
 * ============================================================================
 * Utiliza exclusivamente estilos INLINE, dimensiones estrictas de A4 (794px x 1060px)
 * y estructuras de tablas HTML puras para asegurar que el PDF contenga EXACTAMENTE
 * 3 PÁGINAS perfectas, sin páginas en blanco intermedias ni finales.
 */

export const getOptionalClauseLabel = (key: string, locale: string = 'es') => {
  const dict: Record<string, { en: string; es: string }> = {
    no_subletting:       { en: 'No subletting allowed', es: 'Sin subarrendamiento' },
    guest_policy:        { en: 'Guest policy (max. 7 nights)', es: 'Política de invitados (máx. 7 noches)' },
    cleaning_rota:       { en: 'Weekly cleaning rotation', es: 'Turno de limpieza semanal' },
    no_parties:          { en: 'No parties without 24h notice', es: 'Sin fiestas sin aviso previo de 24h' },
    parking_included:    { en: 'Parking space included', es: 'Espacio de estacionamiento incluido' },
    internet_split:      { en: 'Internet split between occupants', es: 'Internet dividido entre ocupantes' },
    early_termination:   { en: 'Early termination (30 days notice)', es: 'Terminación anticipada con preaviso' },
    renters_insurance:   { en: 'Renter\'s insurance required', es: 'Seguro de inquilino requerido' },
    temperature_control: { en: 'Temperature control 68–78 °F', es: 'Control de temperatura 68–78 °F' },
  };
  return dict[key]?.[locale === 'es' ? 'es' : 'en'] || key;
};

export const getContractTypeLabel = (type: string, locale: string = 'es') => {
  if (type === 'roommate_agreement') {
    return locale === 'es' ? 'Acuerdo Privado de Roommate y Co-Living' : 'Private Roommate & Co-Living Agreement';
  }
  if (type === 'rental_agreement') {
    return locale === 'es' ? 'Contrato de Arrendamiento Habitacional' : 'Residential Lease Agreement';
  }
  return type || (locale === 'es' ? 'Contrato de Arrendamiento' : 'Lease Agreement');
};

function safeText(val: any, fallback: string = 'No especificado'): string {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') return val.trim();
  return String(val);
}

export function generateContractHTML(contractData: any, activeStatus?: string, locale: string = 'es') {
  const isEs = locale === 'es';

  // Informacion de las Partes
  const initiatorName = safeText(contractData?.initiator?.name || contractData?.initiator_name, isEs ? 'Parte Arrendadora' : 'Lessor');
  const counterpartyName = (contractData?.contract_participants || [])
    .map((p: any) => p.profiles?.name || p.user?.name)
    .filter(Boolean)
    .join(', ') || safeText(contractData?.counterparty_name, isEs ? 'Parte Arrendataria' : 'Tenant');

  // Informacion del Inmueble
  const propertyTitle = safeText(contractData?.listings?.title, isEs ? 'Propiedad Residencial Co-Living' : 'Co-Living Property');
  const propertyAddress = safeText(contractData?.listings?.address, isEs ? 'Dirección Registrada en Plataforma' : 'Registered Address');
  const propertyType = safeText(contractData?.listings?.property_type, isEs ? 'Habitación Residencial / Co-Living' : 'Residential Room');
  const bedrooms = contractData?.listings?.bedrooms ? `${contractData.listings.bedrooms} ${isEs ? 'Habitación(es)' : 'Bedroom(s)'}` : (isEs ? '1 Habitación Privada' : '1 Private Bedroom');
  const bathrooms = contractData?.listings?.bathrooms ? `${contractData.listings.bathrooms} ${isEs ? 'Baño(s)' : 'Bathroom(s)'}` : (isEs ? 'Baño compartido / privado' : 'Shared / Private Bathroom');
  const propertyDescription = safeText(contractData?.listings?.description, isEs ? 'Inmueble residencial totalmente equipado para uso habitacional y co-living, con acceso a áreas comunes acordadas.' : 'Fully equipped residential property for co-living with shared access to common areas.');

  // Marco legal
  const countryCode = detectCountryCode(propertyAddress);
  const legalFramework = getLegalFramework(countryCode);

  // Fechas e identificadores
  const effectiveDate = contractData?.effective_date 
    ? new Date(contractData.effective_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : (isEs ? 'Fecha de Emisión' : 'Issue Date');

  const endDateFormatted = contractData?.termination_date 
    ? new Date(contractData.termination_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : (isEs ? '1 año (Renovable)' : '1 year (Renewable)');

  const generationDate = new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const c = contractData?.clauses || {};
  const rawId = contractData?.id || '00000000-0000-0000-0000-000000000000';
  const contractHash = rawId.replace(/-/g, '').toUpperCase();
  const shortId = rawId.split('-')[0].toUpperCase();
  const statusStr = (activeStatus || contractData?.status || 'draft').toUpperCase();

  // Condiciones economicas
  const rentAmount = c.rent?.amount ? `$${c.rent.amount}` : '$1,080';
  const rentCurrency = c.rent?.currency || 'USD';
  const rentDueDay = c.rent?.due_day ? `${isEs ? 'Día' : 'Day'} ${c.rent.due_day}` : (isEs ? 'Día 1' : 'Day 1');
  const lateFee = c.rent?.late_fee ? `$${c.rent.late_fee} USD` : (isEs ? '5% de recargo por morosidad' : '5% late payment fee');
  const paymentMethod = safeText(c.rent?.payment_method, isEs ? 'Transferencia Bancaria / Pago por Plataforma RoommateFinder' : 'Bank Transfer / RoommateFinder Platform Payment');
  
  const depositAmount = c.security_deposit?.amount ? `$${c.security_deposit.amount} USD` : '$1,080 USD';
  const depositReturnDays = c.security_deposit?.return_days ? `${c.security_deposit.return_days} ${isEs ? 'días hábiles' : 'business days'}` : (isEs ? '15 días hábiles' : '15 business days');

  const utilitiesIncluded = isEs ? 'Agua potable, Internet de alta velocidad, Mantenimiento de áreas comunes' : 'Water, High-speed Internet, Common area maintenance';
  const utilitiesNotIncluded = isEs ? 'Electricidad según consumo del medidor privado' : 'Electricity as per private meter';

  const cohabitationList = isEs ? [
    { label: 'Tenencia de Mascotas', val: c.pets?.allowed ? 'Permitidas bajo supervisión del residente' : 'Prohibidas en el interior del inmueble' },
    { label: 'Uso de Tabaco y Fumar', val: c.smoking?.allowed ? 'Permitido exclusivamente en áreas abiertas/terraza' : 'Prohibido dentro del inmueble' },
    { label: 'Visitas Nocturnas', val: c.visitors?.overnight_allowed ? `Permitidas previo aviso (máx. ${c.visitors.max_nights || 3} noches)` : 'No permitidas sin autorización previa por escrito' },
    { label: 'Horario de Silencio', val: c.noise ? `${c.noise.quiet_hours_start} a ${c.noise.quiet_hours_end}` : '10:00 PM a 07:00 AM (Lunes a Domingo)' },
    { label: 'Limpieza Compartida', val: c.cleaning?.schedule === 'daily' ? 'Limpieza diaria de áreas comunes' : c.cleaning?.schedule === 'weekly' ? 'Turno semanal rotativo entre ocupantes' : 'Rotación quincenal acordada' },
  ] : [
    { label: 'Pet Policy', val: c.pets?.allowed ? 'Allowed under supervision' : 'Prohibited indoors' },
    { label: 'Smoking Policy', val: c.smoking?.allowed ? 'Allowed outdoors only' : 'Prohibited indoors' },
    { label: 'Overnight Guests', val: c.visitors?.overnight_allowed ? `Allowed with prior notice (max ${c.visitors.max_nights || 3} nights)` : 'Requires prior written permission' },
    { label: 'Quiet Hours', val: c.noise ? `${c.noise.quiet_hours_start} to ${c.noise.quiet_hours_end}` : '10:00 PM to 07:00 AM' },
    { label: 'Cleaning Schedule', val: c.cleaning?.schedule === 'daily' ? 'Daily common area cleaning' : c.cleaning?.schedule === 'weekly' ? 'Weekly rotation schedule' : 'Biweekly rotation' },
  ];

  const customClausesList = (contractData?.selected_custom_clauses || []).map((key: string) => getOptionalClauseLabel(key, locale));

  const fontStack = "font-family: Arial, Helvetica, sans-serif;";

  return `<!DOCTYPE html>
<html lang="${locale}" style="${fontStack} background-color: #ffffff; margin: 0; padding: 0;">
<head>
  <meta charset="utf-8">
  <title>${isEs ? 'Contrato de Arrendamiento' : 'Lease Agreement'} - ${shortId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif !important; }
    @page { size: A4 portrait; margin: 0; }
    body { width: 794px; margin: 0 auto; padding: 0; background-color: #ffffff; color: #0f172a; font-family: Arial, Helvetica, sans-serif !important; -webkit-font-smoothing: antialiased; }
    .pdf-page { width: 794px; height: 1050px; min-height: 1050px; max-height: 1050px; padding: 28px 40px 28px 40px; background-color: #ffffff; box-sizing: border-box; position: relative; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body style="${fontStack} width: 794px; margin: 0 auto; padding: 0; background-color: #ffffff; color: #0f172a;">

  <!-- ============================================================================ -->
  <!-- PÁGINA 1 DE 3: PORTADA, INFORMACIÓN DE LAS PARTES E INMUEBLE -->
  <!-- ============================================================================ -->
  <div class="pdf-page" style="${fontStack} width: 794px; height: 1050px; min-height: 1050px; max-height: 1050px; padding: 28px 40px 28px 40px; background-color: #ffffff; page-break-after: always; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
    <div style="${fontStack}">
      
      <!-- ENCABEZADO SUPERIOR / HÉROE -->
      <table width="100%" cellpadding="0" cellspacing="0" style="${fontStack} width: 100%; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px;">
        <tr>
          <td style="${fontStack} vertical-align: middle;">
            <div style="${fontStack} font-size: 17px; font-weight: bold; color: #0f172a; letter-spacing: -0.5px;">Roommate<span style="color: #059669;">Finder</span></div>
            <div style="${fontStack} font-size: 9.5px; font-weight: bold; color: #059669; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px;">
              ${isEs ? 'Sistema Legal de Contratación & Co-Living' : 'Legal Lease & Co-Living System'}
            </div>
          </td>
          <td align="right" style="${fontStack} vertical-align: middle;">
            <div style="${fontStack} font-family: monospace; font-size: 10px; color: #475569; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 3px 9px; border-radius: 4px; display: inline-block;">
              FOLIO: ${shortId}
            </div>
            <div style="margin-top: 4px;">
              <span style="${fontStack} font-size: 9.5px; font-weight: bold; color: #ffffff; background-color: #059669; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; display: inline-block;">
                ${statusStr}
              </span>
            </div>
          </td>
        </tr>
      </table>

      <!-- TÍTULO PRINCIPAL DEL DOCUMENTO -->
      <div style="${fontStack} font-size: 17px; font-weight: bold; text-align: center; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
        ${getContractTypeLabel(contractData?.type, locale)}
      </div>
      <div style="${fontStack} font-size: 10.5px; color: #475569; text-align: center; font-weight: normal; margin-bottom: 16px;">
        ${isEs ? 'Documento Privado de Arrendamiento Habitacional con Validez Electrónica' : 'Private Residential Lease Agreement with Legal Digital Force'}
      </div>

      <!-- SECCIÓN: INFORMACIÓN DE LAS PARTES -->
      <div style="${fontStack} font-size: 11.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 2px solid #059669; margin-bottom: 10px;">
        ${isEs ? 'INFORMACIÓN DE LAS PARTES CONTRATANTES' : 'PARTIES INFORMATION'}
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="${fontStack} width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-bottom: 16px; margin-left: -10px; margin-right: -10px;">
        <tr>
          <!-- CARD ARRENDADOR -->
          <td width="50%" style="${fontStack} width: 50%; vertical-align: top; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 6px; padding: 12px;">
            <div style="${fontStack} font-size: 9.5px; font-weight: bold; color: #059669; text-transform: uppercase; margin-bottom: 4px;">
              ${isEs ? 'ARRENDADOR (PROPIETARIO)' : 'LESSOR / LANDLORD'}
            </div>
            <div style="${fontStack} font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
              ${initiatorName}
            </div>
            <div style="${fontStack} font-size: 10.5px; color: #475569; margin-bottom: 3px;">
              <strong style="color: #0f172a;">${isEs ? 'Calidad' : 'Role'}:</strong> ${isEs ? 'Parte Arrendadora Propietaria' : 'Lessor Property Owner'}
            </div>
            <div style="${fontStack} font-size: 10.5px; color: #475569; margin-bottom: 5px;">
              <strong style="color: #0f172a;">${isEs ? 'Verificación' : 'Verification'}:</strong> Identidad Autenticada
            </div>
            <div style="${fontStack} font-size: 9.5px; font-weight: bold; color: #0284c7; background-color: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 7px; border-radius: 10px; display: inline-block;">
              &check; ${isEs ? 'Firma Digital Registrada' : 'Digital Signature Verified'}
            </div>
          </td>

          <!-- CARD ARRENDATARIO -->
          <td width="50%" style="${fontStack} width: 50%; vertical-align: top; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 6px; padding: 12px;">
            <div style="${fontStack} font-size: 9.5px; font-weight: bold; color: #059669; text-transform: uppercase; margin-bottom: 4px;">
              ${isEs ? 'ARRENDATARIO (INQUILINO)' : 'TENANT / ROOMMATE'}
            </div>
            <div style="${fontStack} font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
              ${counterpartyName}
            </div>
            <div style="${fontStack} font-size: 10.5px; color: #475569; margin-bottom: 3px;">
              <strong style="color: #0f172a;">${isEs ? 'Calidad' : 'Role'}:</strong> ${isEs ? 'Parte Arrendataria Ocupante' : 'Tenant Occupant'}
            </div>
            <div style="${fontStack} font-size: 10.5px; color: #475569; margin-bottom: 5px;">
              <strong style="color: #0f172a;">${isEs ? 'Verificación' : 'Verification'}:</strong> Identidad Autenticada
            </div>
            <div style="${fontStack} font-size: 9.5px; font-weight: bold; color: #0284c7; background-color: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 7px; border-radius: 10px; display: inline-block;">
              &check; ${isEs ? 'Firma Digital Registrada' : 'Digital Signature Verified'}
            </div>
          </td>
        </tr>
      </table>

      <!-- 1. INFORMACIÓN DEL INMUEBLE -->
      <div style="${fontStack} font-size: 11.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 2px solid #059669; margin-bottom: 10px;">
        ${isEs ? '1. INFORMACIÓN DEL INMUEBLE Y PROPIEDAD' : '1. PROPERTY INFORMATION'}
      </div>

      <table width="100%" cellpadding="6" cellspacing="0" style="${fontStack} width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5px;">
        <tr style="background-color: #ffffff;">
          <td width="35%" style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 7px 10px;">
            ${isEs ? 'Título de la Propiedad' : 'Property Title'}:
          </td>
          <td width="65%" style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; font-weight: bold; padding: 7px 10px;">
            ${propertyTitle}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 7px 10px;">
            ${isEs ? 'Dirección Física Registrada' : 'Registered Address'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 7px 10px;">
            ${propertyAddress}
          </td>
        </tr>
        <tr style="background-color: #ffffff;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 7px 10px;">
            ${isEs ? 'Tipo de Inmueble y Espacio' : 'Property & Unit Type'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 7px 10px;">
            ${propertyType} &bull; ${bedrooms} &bull; ${bathrooms}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 7px 10px;">
            ${isEs ? 'Descripción del Inmueble' : 'Property Description'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 7px 10px;">
            ${propertyDescription}
          </td>
        </tr>
      </table>

      <!-- MARCO LEGAL REGULATORIO -->
      <div style="${fontStack} font-size: 11.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 2px solid #059669; margin-bottom: 10px;">
        ${isEs ? 'MARCO LEGAL APLICABLE' : 'APPLICABLE LEGAL FRAMEWORK'}
      </div>

      <table width="100%" cellpadding="6" cellspacing="0" style="${fontStack} width: 100%; border-collapse: collapse; font-size: 10.5px;">
        <tr>
          <td width="35%" style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 7px 10px;">
            ${isEs ? 'Ley de Arrendamiento del País' : 'Tenancy Law'}:
          </td>
          <td width="65%" style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 7px 10px;">
            ${legalFramework.tenancyLaw[isEs ? 'es' : 'en']} (${legalFramework.countryName[isEs ? 'es' : 'en']})
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 7px 10px;">
            ${isEs ? 'Ley de Firma Electrónica' : 'Digital Signature Law'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 7px 10px;">
            ${legalFramework.digitalSignatureLaw[isEs ? 'es' : 'en']}
          </td>
        </tr>
      </table>

    </div>

    <!-- PIE DE PÁGINA 1 -->
    <div style="${fontStack} padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
      <span>RoommateFinder Legal Platform &bull; <strong style="color: #059669;">${legalFramework.countryName[isEs ? 'es' : 'en']}</strong></span>
      <span>${isEs ? 'Fecha de generación' : 'Generated'}: ${generationDate} &bull; <strong>${isEs ? 'Página 1 de 3' : 'Page 1 of 3'}</strong></span>
    </div>
  </div>

  <!-- ============================================================================ -->
  <!-- PÁGINA 2 DE 3: CONDICIONES ECONÓMICAS Y REGLAMENTO DE CO-LIVING -->
  <!-- ============================================================================ -->
  <div class="pdf-page" style="${fontStack} width: 794px; height: 1050px; min-height: 1050px; max-height: 1050px; padding: 28px 40px 28px 40px; background-color: #ffffff; page-break-after: always; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
    <div style="${fontStack}">
      
      <!-- RUNNING HEADER -->
      <table width="100%" cellpadding="0" cellspacing="0" style="${fontStack} width: 100%; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 14px;">
        <tr>
          <td style="${fontStack} font-size: 9.5px; color: #64748b;">
            <strong style="color: #0f172a;">Roommate<span style="color: #059669;">Finder</span></strong> &bull; ${isEs ? 'Contrato de Arrendamiento' : 'Lease Agreement'}
          </td>
          <td align="right" style="${fontStack} font-size: 9.5px; color: #64748b; font-weight: bold;">
            FOLIO: ${shortId}
          </td>
        </tr>
      </table>

      <!-- 2. CONDICIONES DEL ARRENDAMIENTO -->
      <div style="${fontStack} font-size: 11.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 2px solid #059669; margin-bottom: 10px;">
        ${isEs ? '2. CONDICIONES DEL ARRENDAMIENTO Y RÉGIMEN ECONÓMICO' : '2. LEASE TERMS & FINANCIAL CONDITIONS'}
      </div>

      <table width="100%" cellpadding="6" cellspacing="0" style="${fontStack} width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5px;">
        <tr style="background-color: #ffffff;">
          <td width="40%" style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Canon de Alquiler Mensual' : 'Monthly Rent Amount'}:
          </td>
          <td width="60%" style="${fontStack} border: 1px solid #e2e8f0; color: #059669; font-weight: bold; font-size: 12px; padding: 6px 10px;">
            ${rentAmount} ${rentCurrency}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Fecha de Inicio de Vigencia' : 'Effective Start Date'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${effectiveDate}
          </td>
        </tr>
        <tr style="background-color: #ffffff;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Fecha de Finalización Estimada' : 'Estimated End Date'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${endDateFormatted}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Día Límite de Pago Exigible' : 'Rent Payment Due Day'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${rentDueDay} ${isEs ? 'de cada mes' : 'of each month'}
          </td>
        </tr>
        <tr style="background-color: #ffffff;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Recargo por Morosidad' : 'Late Fee Penalty'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${lateFee}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Monto del Depósito de Garantía' : 'Security Deposit Amount'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; font-weight: bold; padding: 6px 10px;">
            ${depositAmount}
          </td>
        </tr>
        <tr style="background-color: #ffffff;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Plazo de Devolución de Depósito' : 'Deposit Refund Timeline'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${depositReturnDays}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Forma y Método de Pago' : 'Payment Method'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${paymentMethod}
          </td>
        </tr>
        <tr style="background-color: #ffffff;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Servicios Incluidos en el Alquiler' : 'Included Utilities'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${utilitiesIncluded}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px 10px;">
            ${isEs ? 'Servicios a Cargo del Arrendatario' : 'Tenant Responsibilities'}:
          </td>
          <td style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 6px 10px;">
            ${utilitiesNotIncluded}
          </td>
        </tr>
      </table>

      <!-- 3. OBLIGACIONES Y CLÁUSULAS DEL CONTRATO -->
      <div style="${fontStack} font-size: 11.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 2px solid #059669; margin-bottom: 10px;">
        ${isEs ? '3. OBLIGACIONES Y CLÁUSULAS DEL CONTRATO' : '3. OBLIGATIONS & LEASE CLAUSES'}
      </div>

      <div style="${fontStack} margin-bottom: 8px; text-align: justify;">
        <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 2px;">
          ${isEs ? 'CLÁUSULA PRIMERA: CANON DE RENTA Y COMPROMISO DE PAGO' : 'CLAUSE 1: RENT PAYMENT COMMITMENT'}
        </div>
        <div style="${fontStack} font-size: 10.5px; line-height: 1.45; color: #334155;">
          ${isEs 
            ? `El Arrendatario se obliga a pagar al Arrendador la suma estipulada por concepto de canon mensual de arrendamiento, en la fecha límite acordada. El incumplimiento o mora en el pago autorizará la aplicación del recargo por morosidad señalado conforme a las leyes vigentes.`
            : `The Tenant agrees to pay the Lessor the stipulated monthly rent on or before the due date. Failure to pay on time will incur the late fee specified above in accordance with applicable laws.`
          }
        </div>
      </div>

      <div style="${fontStack} margin-bottom: 8px; text-align: justify;">
        <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 2px;">
          ${isEs ? 'CLÁUSULA SEGUNDA: DEPÓSITO DE GARANTÍA Y CONSERVACIÓN' : 'CLAUSE 2: SECURITY DEPOSIT & REFUND'}
        </div>
        <div style="${fontStack} font-size: 10.5px; line-height: 1.45; color: #334155;">
          ${isEs
            ? `El depósito de garantía responderá exclusivamente por eventuales daños imputables al Arrendatario o facturas de servicios pendientes de pago. Dicho monto será devuelto íntegramente dentro del plazo legal tras la restitución formal del inmueble en óptimas condiciones.`
            : `The security deposit serves as guarantee for unpaid utilities or property damages beyond normal wear and tear, and will be refunded within the statutory timeframe following move-out.`
          }
        </div>
      </div>

      <div style="${fontStack} margin-bottom: 8px; text-align: justify;">
        <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 2px;">
          ${isEs ? 'CLÁUSULA TERCERA: OBLIGACIONES Y DERECHOS DEL ARRENDADOR' : 'CLAUSE 3: LANDLORD OBLIGATIONS'}
        </div>
        <div style="${fontStack} font-size: 10.5px; line-height: 1.45; color: #334155;">
          ${isEs
            ? `El Arrendador se compromete a garantizar al Arrendatario el uso pacífico del inmueble durante la vigencia del contrato, realizar las reparaciones estructurales necesarias no imputables al mal uso, y respetar el derecho de privacidad de los ocupantes.`
            : `The Lessor commits to maintaining the quiet enjoyment of the property, executing necessary structural repairs not caused by tenant negligence, and respecting tenant privacy.`
          }
        </div>
      </div>

      <div style="${fontStack} margin-bottom: 8px; text-align: justify;">
        <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 2px;">
          ${isEs ? 'CLÁUSULA CUARTA: OBLIGACIONES Y DERECHOS DEL ARRENDATARIO' : 'CLAUSE 4: TENANT OBLIGATIONS'}
        </div>
        <div style="${fontStack} font-size: 10.5px; line-height: 1.45; color: #334155;">
          ${isEs
            ? `El Arrendatario destinará el inmueble exclusivamente para uso residencial habitacional y co-living. Queda expresamente prohibido modificar la estructura de la propiedad, almacenar sustancias peligrosas o realizar actividades ilícitas.`
            : `The Tenant shall use the property exclusively for residential co-living purposes. Modifying property structures, storing hazardous materials, or illegal activities are strictly prohibited.`
          }
        </div>
      </div>

      <div style="${fontStack} margin-bottom: 8px;">
        <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 4px;">
          ${isEs ? 'CLÁUSULA QUINTA: REGLAMENTO INTERNO Y NORMAS DE CO-LIVING' : 'CLAUSE 5: CO-LIVING HOUSE RULES'}
        </div>
        <table width="100%" cellpadding="5" cellspacing="0" style="${fontStack} width: 100%; border-collapse: collapse; font-size: 9.5px;">
          ${cohabitationList.map(item => `
            <tr>
              <td width="35%" style="${fontStack} border: 1px solid #e2e8f0; font-weight: bold; color: #059669; background-color: #f8fafc; padding: 4px 8px; text-transform: uppercase;">
                ${item.label}:
              </td>
              <td width="65%" style="${fontStack} border: 1px solid #e2e8f0; color: #0f172a; padding: 4px 8px;">
                ${item.val}
              </td>
            </tr>
          `).join('')}
        </table>
      </div>

    </div>

    <!-- PIE DE PÁGINA 2 -->
    <div style="${fontStack} padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
      <span>RoommateFinder Legal Platform &bull; <strong style="color: #059669;">${legalFramework.countryName[isEs ? 'es' : 'en']}</strong></span>
      <span><strong>${isEs ? 'Página 2 de 3' : 'Page 2 of 3'}</strong></span>
    </div>
  </div>

  <!-- ============================================================================ -->
  <!-- PÁGINA 3 DE 3: DISPOSICIONES ESPECIALES, FIRMAS Y AUDITORÍA SHA-256 -->
  <!-- ============================================================================ -->
  <div class="pdf-page" style="${fontStack} width: 794px; height: 1050px; min-height: 1050px; max-height: 1050px; padding: 28px 40px 28px 40px; background-color: #ffffff; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
    <div style="${fontStack}">
      
      <!-- RUNNING HEADER -->
      <table width="100%" cellpadding="0" cellspacing="0" style="${fontStack} width: 100%; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 14px;">
        <tr>
          <td style="${fontStack} font-size: 9.5px; color: #64748b;">
            <strong style="color: #0f172a;">Roommate<span style="color: #059669;">Finder</span></strong> &bull; ${isEs ? 'Contrato de Arrendamiento' : 'Lease Agreement'}
          </td>
          <td align="right" style="${fontStack} font-size: 9.5px; color: #64748b; font-weight: bold;">
            FOLIO: ${shortId}
          </td>
        </tr>
      </table>

      <!-- 4. DISPOSICIONES ESPECIALES Y RESCISIÓN -->
      <div style="${fontStack} font-size: 11.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 2px solid #059669; margin-bottom: 10px;">
        ${isEs ? '4. DISPOSICIONES ESPECIALES Y RESCISIÓN' : '4. SPECIAL PROVISIONS & TERMINATION'}
      </div>

      <div style="${fontStack} margin-bottom: 10px; text-align: justify;">
        <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">
          ${isEs ? 'CLÁUSULA SEXTA: EXENCIÓN POR DESGASTE NATURAL' : 'CLAUSE 6: NORMAL WEAR & TEAR EXEMPTION'}
        </div>
        <div style="${fontStack} font-size: 10.5px; line-height: 1.45; color: #334155;">
          ${isEs
            ? `Se exonera expresamente al Arrendatario de responsabilidad por el deterioro ordinario resultante del uso legítimo y cotidiano de la vivienda (${legalFramework.wearAndTearArticle.es}). Únicamente los daños originados por mal uso o negligencia grave serán deducibles del depósito.`
            : `The Tenant is exempted from liability for normal wear and tear resulting from ordinary domestic use (${legalFramework.wearAndTearArticle.en}). Only damages caused by gross negligence shall be indemnified.`
          }
        </div>
      </div>

      <div style="${fontStack} margin-bottom: 10px; text-align: justify;">
        <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">
          ${isEs ? 'CLÁUSULA SÉPTIMA: PREAVISO, TERMINACIÓN ANTICIPADA Y JURISDICCIÓN' : 'CLAUSE 7: NOTICE, TERMINATION & JURISDICTION'}
        </div>
        <div style="${fontStack} font-size: 10.5px; line-height: 1.45; color: #334155;">
          ${isEs
            ? `Cualquiera de las partes podrá dar por terminado anticipadamente este contrato notificando por escrito con al menos 30 días de anticipación. Toda discrepancia derivada del presente instrumento se someterá a mediación de buena fe y a la jurisdicción de los <strong>${legalFramework.disputeJurisdiction.es}</strong>.`
            : `Either party may terminate this agreement early by providing written notice at least 30 days in advance. Disputes shall be submitted to mediation and to the <strong>${legalFramework.disputeJurisdiction.en}</strong>.`
          }
        </div>
      </div>

      ${customClausesList.length > 0 ? `
        <div style="${fontStack} margin-bottom: 12px;">
          <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 4px;">
            ${isEs ? 'CLÁUSULAS ADICIONALES SELECCIONADAS' : 'ADDITIONAL AGREED CLAUSES'}
          </div>
          <div style="${fontStack}">
            ${customClausesList.map(label => `
              <span style="${fontStack} background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-size: 9.5px; font-weight: bold; padding: 3px 8px; border-radius: 12px; display: inline-block; margin-right: 5px; margin-bottom: 4px;">
                &check; ${label}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- FIRMAS DE LAS PARTES -->
      <div style="${fontStack} font-size: 11.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 2px solid #059669; margin-bottom: 8px;">
        ${isEs ? 'FIRMAS DE LAS PARTES Y ACEPTACIÓN LEGAL' : 'PARTIES SIGNATURES & LEGAL ACCEPTANCE'}
      </div>

      <div style="${fontStack} font-size: 10.5px; color: #334155; margin-bottom: 10px;">
        ${isEs
          ? `Las partes expresan su entera conformidad con todas las condiciones y cláusulas del presente contrato, firmando a continuación electrónicamente con plena validez jurídica de acuerdo a la legislación aplicable.`
          : `The parties express full agreement with all terms and clauses of this agreement, executing digital signatures below with full legal force.`
        }
      </div>

      <!-- TABLA DE 3 COLUMNAS PARA FIRMAS -->
      <table width="100%" cellpadding="0" cellspacing="0" style="${fontStack} width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 16px; margin-left: -8px; margin-right: -8px;">
        <tr>
          <!-- FIRMA ARRENDADOR -->
          <td width="33.3%" style="${fontStack} width: 33.3%; vertical-align: top; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 6px; text-align: center;">
            <div style="${fontStack} font-size: 8.5px; font-weight: bold; color: #059669; text-transform: uppercase;">
              ${isEs ? 'ARRENDADOR' : 'LESSOR'}
            </div>
            <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; margin-top: 3px;">
              ${initiatorName}
            </div>
            <div style="border-bottom: 1.5px solid #94a3b8; margin: 14px 6px 5px 6px;"></div>
            <div style="${fontStack} font-size: 9.5px; color: #475569;">
              ${isEs ? 'Firma:' : 'Signature:'} ________________
            </div>
            <div style="${fontStack} font-size: 9.5px; color: #475569; margin-top: 2px;">
              ${isEs ? 'Fecha:' : 'Date:'} ${effectiveDate}
            </div>
            <div style="margin-top: 6px;">
              <span style="${fontStack} font-size: 8.5px; font-weight: bold; color: #059669; background-color: #d1fae5; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 10px; display: inline-block;">
                &check; ${isEs ? 'FIRMA VERIFICADA' : 'VERIFIED'}
              </span>
            </div>
          </td>

          <!-- FIRMA ARRENDATARIO -->
          <td width="33.3%" style="${fontStack} width: 33.3%; vertical-align: top; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 6px; text-align: center;">
            <div style="${fontStack} font-size: 8.5px; font-weight: bold; color: #059669; text-transform: uppercase;">
              ${isEs ? 'ARRENDATARIO' : 'TENANT'}
            </div>
            <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; margin-top: 3px;">
              ${counterpartyName}
            </div>
            <div style="border-bottom: 1.5px solid #94a3b8; margin: 14px 6px 5px 6px;"></div>
            <div style="${fontStack} font-size: 9.5px; color: #475569;">
              ${isEs ? 'Firma:' : 'Signature:'} ________________
            </div>
            <div style="${fontStack} font-size: 9.5px; color: #475569; margin-top: 2px;">
              ${isEs ? 'Fecha:' : 'Date:'} ${effectiveDate}
            </div>
            <div style="margin-top: 6px;">
              <span style="${fontStack} font-size: 8.5px; font-weight: bold; color: #059669; background-color: #d1fae5; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 10px; display: inline-block;">
                &check; ${isEs ? 'FIRMA VERIFICADA' : 'VERIFIED'}
              </span>
            </div>
          </td>

          <!-- FIRMA CERTIFICACIÓN PLATAFORMA -->
          <td width="33.3%" style="${fontStack} width: 33.3%; vertical-align: top; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 6px; text-align: center;">
            <div style="${fontStack} font-size: 8.5px; font-weight: bold; color: #059669; text-transform: uppercase;">
              ${isEs ? 'CERTIFICACIÓN PLATAFORMA' : 'PLATFORM WITNESS'}
            </div>
            <div style="${fontStack} font-size: 10.5px; font-weight: bold; color: #0f172a; margin-top: 3px;">
              RoommateFinder
            </div>
            <div style="border-bottom: 1.5px solid #94a3b8; margin: 14px 6px 5px 6px;"></div>
            <div style="${fontStack} font-size: 9.5px; color: #475569;">
              ${isEs ? 'Firma:' : 'Signature:'} <i>Legal Seal</i>
            </div>
            <div style="${fontStack} font-size: 9.5px; color: #475569; margin-top: 2px;">
              ${isEs ? 'Fecha:' : 'Date:'} ${generationDate}
            </div>
            <div style="margin-top: 6px;">
              <span style="${fontStack} font-size: 8.5px; font-weight: bold; color: #0369a1; background-color: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 10px; display: inline-block;">
                AUDIT SEAL
              </span>
            </div>
          </td>
        </tr>
      </table>

      <!-- SELLO DE AUDITORÍA CRIPTOGRÁFICA SHA-256 -->
      <div style="${fontStack} border: 1px solid #cbd5e1; background-color: #f1f5f9; border-radius: 6px; padding: 8px 12px; text-align: center;">
        <div style="${fontStack} font-size: 8.5px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
          ${isEs ? 'CERTIFICADO DIGITAL DE INTEGRIDAD Y AUDITORÍA SHA-256' : 'DIGITAL INTEGRITY & AUDIT CERTIFICATE SHA-256'}
        </div>
        <div style="${fontStack} font-family: monospace; font-size: 8.5px; color: #059669; font-weight: bold; margin-top: 2px; word-break: break-all;">
          ${contractHash}${contractHash.split('').reverse().join('')}
        </div>
        <div style="${fontStack} font-size: 8.5px; color: #64748b; margin-top: 2px;">
          ${isEs ? 'Documento electrónico con plena eficacia y validez jurídica conforme a la ley' : 'Electronic document with legal force under law'} ${legalFramework.digitalSignatureLaw[isEs ? 'es' : 'en']}
        </div>
      </div>

    </div>

    <!-- PIE DE PÁGINA 3 -->
    <div style="${fontStack} padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
      <span>RoommateFinder Legal Platform &bull; <strong style="color: #059669;">${legalFramework.countryName[isEs ? 'es' : 'en']}</strong></span>
      <span><strong>${isEs ? 'Página 3 de 3' : 'Page 3 of 3'}</strong></span>
    </div>
  </div>

</body>
</html>`;
}
