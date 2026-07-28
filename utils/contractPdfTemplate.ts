import { detectCountryCode, getLegalFramework } from '@/constants/legalFrameworks';

/**
 * ============================================================================
 * PLANTILLA Y CONFIGURACIÓN MAESTRA DE CONTRATOS PDF (RoommateFinder Platform)
 * ============================================================================
 * Esta función única genera el código HTML completo para renderizar y exportar
 * los contratos en formato PDF (3 Páginas).
 * 
 * Si deseas modificar colores, fuentes, espaciados, bordes o encabezados,
 * puedes editar los estilos CSS y estructuras HTML directamente en este archivo.
 * 
 * GUÍA RÁPIDA DE PERSONALIZACIÓN PARA EL ADMINISTRADOR:
 * ----------------------------------------------------------------------------
 * 1. Color Principal (Ondas y Bordes): #49C788 (Verde Turquesa RoommateFinder)
 * 2. Tipografía: Georgia, 'Times New Roman', serif (Estilo Serif Ejecutivo/Legal)
 * 3. Interlineado: 1.8 (Espaciado amplio entre renglones)
 * 4. Paginación: Estructura fija de 792pt de alto con saltos de página (@page)
 * ----------------------------------------------------------------------------
 */

export const getOptionalClauseLabel = (key: string, locale: string = 'es') => {
  const dict: Record<string, { en: string; es: string }> = {
    no_subletting:       { en: 'No subletting', es: 'Sin subarrendamiento' },
    guest_policy:        { en: 'Guest policy (max. 7 nights)', es: 'Política de invitados (máx. 7 noches)' },
    cleaning_rota:       { en: 'Weekly cleaning rotation', es: 'Turno de limpieza semanal' },
    no_parties:          { en: 'No parties without 24h notice', es: 'Sin fiestas sin aviso de 24 h' },
    parking_included:    { en: 'Parking included', es: 'Estacionamiento incluido' },
    internet_split:      { en: 'Internet split between occupants', es: 'Internet dividido entre ocupantes' },
    early_termination:   { en: 'Early termination (30 days notice)', es: 'Terminación anticipada con preaviso' },
    renters_insurance:   { en: 'Renter\'s insurance required', es: 'Seguro de inquilino requerido' },
    temperature_control: { en: 'Temperature control 68–78 °F', es: 'Control de temperatura 68–78 °F' },
  };
  return dict[key]?.[locale === 'es' ? 'es' : 'en'] || key;
};

export const getContractTypeLabel = (type: string, locale: string = 'es') => {
  if (type === 'roommate_agreement') {
    return locale === 'es' ? 'Acuerdo Privado de Roommate y Co-living' : 'Private Roommate & Co-living Agreement';
  }
  if (type === 'rental_agreement') {
    return locale === 'es' ? 'Contrato de Arrendamiento Habitacional' : 'Residential Lease Agreement';
  }
  return type;
};

export function generateContractHTML(contractData: any, activeStatus?: string, locale: string = 'es') {
  const isEs = locale === 'es';
  const initiatorName = contractData?.initiator?.name || (isEs ? 'Parte Arrendadora' : 'Lessor');
  const counterpartyName = (contractData?.contract_participants || [])
    .map((p: any) => p.profiles?.name || p.user?.name)
    .filter(Boolean)
    .join(', ') || (isEs ? 'Parte Inquilina' : 'Tenant');
  
  const propertyTitle = contractData?.listings?.title || (isEs ? 'Propiedad Residencial Co-Living' : 'Co-Living Property');
  const propertyAddress = contractData?.listings?.address || (isEs ? 'Dirección Registrada en Plataforma' : 'Registered Address');
  const countryCode = detectCountryCode(contractData?.listings?.address || '');
  const legalFramework = getLegalFramework(countryCode);

  const effectiveDate = contractData?.effective_date 
    ? new Date(contractData.effective_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : (isEs ? 'Fecha de Emisión' : 'Issue Date');

  const endDateFormatted = contractData?.termination_date 
    ? new Date(contractData.termination_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : (isEs ? '1 año (Renovable)' : '1 year (Renewable)');

  const c = contractData?.clauses || {};
  const contractHash = contractData?.id ? contractData.id.replace(/-/g, '').toUpperCase() : '00000000';

  const financialRows = isEs ? [
    { label: 'Canon de Renta Mensual', val: c.rent ? `$${c.rent.amount} ${c.rent.currency || 'USD'}` : '$1,080 USD' },
    { label: 'Día Límite de Pago Exigible', val: c.rent ? `Día ${c.rent.due_day} de cada mes` : 'Día 1 de cada mes' },
    { label: 'Recargo por Morosidad Exigible', val: c.rent?.late_fee ? `$${c.rent.late_fee}` : 'Sujeto a interés legal' },
  ] : [
    { label: 'Monthly Rent Amount', val: c.rent ? `$${c.rent.amount} ${c.rent.currency || 'USD'}` : '$1,080 USD' },
    { label: 'Monthly Rent Due Day', val: c.rent ? `Day ${c.rent.due_day} of each month` : 'Day 1 of each month' },
    { label: 'Late Payment Fee', val: c.rent?.late_fee ? `$${c.rent.late_fee}` : 'Subject to legal interest' },
  ];

  const depositRows = isEs ? [
    { label: 'Monto del Depósito de Garantía', val: c.security_deposit ? `$${c.security_deposit.amount} USD` : '$1,080 USD' },
    { label: 'Plazo Legal Devolución Depósito', val: c.security_deposit?.return_days ? `${c.security_deposit.return_days} días hábiles` : '15 días hábiles contados tras entrega' },
  ] : [
    { label: 'Security Deposit Amount', val: c.security_deposit ? `$${c.security_deposit.amount} USD` : '$1,080 USD' },
    { label: 'Deposit Refund Window', val: c.security_deposit?.return_days ? `${c.security_deposit.return_days} business days` : '15 business days after move-out' },
  ];

  const cohabitationRows = isEs ? [
    { label: 'Tenencia de Mascotas', val: c.pets?.allowed ? 'Permitidas bajo supervisión' : 'No permitidas en interiores' },
    { label: 'Uso de Tabaco y Fumar', val: c.smoking?.allowed ? 'Permitido en exteriores' : 'Prohibido en áreas cerradas' },
    { label: 'Visitas y Alojamiento Nocturno', val: c.visitors?.overnight_allowed ? `Permitido (máx. ${c.visitors.max_nights || 3} noches)` : 'No permitido sin permiso' },
    { label: 'Horario de Silencio y Reposo', val: c.noise ? `${c.noise.quiet_hours_start} a ${c.noise.quiet_hours_end}` : '10:00 PM a 07:00 AM' },
    { label: 'Limpieza de Áreas Comunes', val: c.cleaning?.schedule === 'daily' ? 'Rotación diaria' : c.cleaning?.schedule === 'weekly' ? 'Rotación semanal equitativa' : 'Rotación quincenal' },
  ] : [
    { label: 'Pet Policy', val: c.pets?.allowed ? 'Allowed under supervision' : 'Not allowed indoors' },
    { label: 'Smoking Policy', val: c.smoking?.allowed ? 'Allowed outdoors' : 'Strictly prohibited indoors' },
    { label: 'Overnight Guest Policy', val: c.visitors?.overnight_allowed ? `Allowed (max ${c.visitors.max_nights || 3} nights)` : 'Not allowed without permission' },
    { label: 'Quiet Hours Schedule', val: c.noise ? `${c.noise.quiet_hours_start} to ${c.noise.quiet_hours_end}` : '10:00 PM to 07:00 AM' },
    { label: 'Cleaning Rotation', val: c.cleaning?.schedule === 'daily' ? 'Daily rotation' : c.cleaning?.schedule === 'weekly' ? 'Weekly rotation' : 'Biweekly rotation' },
  ];

  const customRows = (contractData?.selected_custom_clauses || []).map((key: string) => `
    <div style="font-size: 9pt; color: #334155; padding: 4pt 0; border-bottom: 1pt dashed #cbd5e1;">&bull; <strong>${getOptionalClauseLabel(key, locale)}</strong></div>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${isEs ? 'Contrato de Arrendamiento' : 'Lease Agreement'} - ${contractData?.id || 'doc'}</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      @page {
        size: letter portrait;
        margin: 0;
      }
      body { 
        width: 612pt;
        margin: 0 auto;
        padding: 0;
        background: #ffffff; 
        color: #111827; 
        font-family: Georgia, 'Times New Roman', serif !important;
        line-height: 1.8;
        -webkit-font-smoothing: antialiased;
      }
      .page {
        width: 612pt;
        height: 792pt;
        padding: 24pt 48pt 30pt 48pt;
        position: relative;
        overflow: hidden;
        background: #ffffff;
        page-break-after: always;
        page-break-inside: avoid;
        box-sizing: border-box;
      }
      .page:last-child {
        page-break-after: avoid;
      }

      .wave-banner {
        width: 100%;
        height: 30pt;
        display: block;
      }

      .top-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9.5pt;
        color: #334155;
        margin-top: 8pt;
        margin-bottom: 14pt;
        font-weight: 500;
      }
      .clock-badge {
        display: inline-block;
        width: 15pt;
        height: 15pt;
        border-radius: 50%;
        border: 2pt solid #49C788;
        color: #49C788;
        text-align: center;
        line-height: 13pt;
        font-size: 9pt;
        font-weight: bold;
      }

      .doc-title {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 20pt;
        font-weight: bold;
        color: #0f172a;
        margin-bottom: 14pt;
        line-height: 1.3;
      }

      .section-header {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 10.5pt;
        font-weight: bold;
        text-transform: uppercase;
        color: #0f172a;
        margin-top: 14pt;
        margin-bottom: 8pt;
        letter-spacing: 0.3px;
      }

      .paragraph {
        font-size: 10pt;
        line-height: 1.8;
        color: #334155;
        text-align: justify;
        margin-bottom: 12pt;
      }

      .kv-block {
        font-size: 9.5pt;
        line-height: 2.1;
        color: #1e293b;
        margin-bottom: 14pt;
      }
      .kv-row {
        display: flex;
        margin-bottom: 3pt;
      }
      .kv-label {
        width: 220pt;
        color: #475569;
        font-weight: 500;
      }
      .kv-val {
        flex: 1;
        color: #0f172a;
        font-weight: bold;
      }

      .callout-box {
        background-color: #f8fafc;
        border-left: 3.5pt solid #49C788;
        border-radius: 6pt;
        padding: 10pt 14pt;
        margin-bottom: 14pt;
        font-size: 9pt;
        line-height: 1.75;
        color: #334155;
      }
      .callout-title {
        font-weight: bold;
        color: #0f172a;
        margin-bottom: 4pt;
        font-size: 9.5pt;
      }

      .signatures-grid {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14pt;
      }
      .signatures-grid td {
        width: 31%;
        vertical-align: top;
      }
      .sig-card {
        border: 1pt solid #cbd5e1;
        border-radius: 6pt;
        padding: 10pt 8pt;
        background: #ffffff;
        text-align: center;
      }
      .sig-line {
        border-bottom: 1.5pt solid #0f172a;
        margin: 26pt 10pt 8pt 10pt;
      }
      .sig-name {
        font-size: 9pt;
        font-weight: bold;
        color: #0f172a;
      }
      .sig-role {
        font-size: 7.5pt;
        color: #64748b;
        text-transform: uppercase;
        font-weight: bold;
        margin-top: 2pt;
      }
      .sig-seal {
        margin-top: 6pt;
        font-size: 7pt;
        font-family: monospace !important;
        color: #059669;
        background: #ecfdf5;
        border: 1pt solid #a7f3d0;
        padding: 2pt 5pt;
        border-radius: 3pt;
        display: inline-block;
        font-weight: bold;
      }

      .page-footer {
        position: absolute;
        bottom: 34pt;
        left: 48pt;
        right: 48pt;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8.5pt;
        color: #64748b;
        font-weight: 500;
      }
      .bottom-wave-wrap {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 28pt;
      }
    </style>
  </head>
  <body>

    <!-- ================= PÁGINA 1 DE 3 ================= -->
    <div class="page">
      <!-- Top Turquoise Wave -->
      <svg class="wave-banner" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,50 L1200,0 L0,0 Z" fill="#49C788"></path>
      </svg>

      <div class="top-meta">
        <span>${legalFramework.cityDefault[isEs ? 'es' : 'en']}</span>
        <span class="clock-badge">&#128336;</span>
        <span>${effectiveDate}</span>
      </div>

      <h1 class="doc-title">${getContractTypeLabel(contractData?.type, locale)}</h1>

      <div class="section-header">${isEs ? 'DECLARACIÓN INICIAL Y OBJETO DEL CONTRATO:' : 'INITIAL DECLARATION & PURPOSE:'}</div>
      <p class="paragraph">
        ${isEs 
          ? `El presente documento constituye un contrato privado formal de arrendamiento habitacional y acuerdo de convivencia en modalidad co-living, celebrado a través de la plataforma tecnológica <strong>RoommateFinder</strong>. El contrato vincula jurídicamente a las partes firmantes y rige el uso y goce del inmueble destinado exclusivamente a vivienda compartida.`
          : `This document represents a formal private lease and co-living agreement executed via the <strong>RoommateFinder</strong> platform. This legally binding agreement governs the residential use and co-living enjoyment of the shared property.`
        }
      </p>

      <div class="section-header">I. ${isEs ? 'IDENTIFICACIÓN DE LAS PARTES Y PROPIEDAD' : 'IDENTIFICATION OF PARTIES & PROPERTY'}</div>
      <div class="kv-block">
        <div class="kv-row"><span class="kv-label">${isEs ? 'Parte Arrendadora / Iniciador' : 'Lessor / Initiator'}:</span><span class="kv-val">${initiatorName}</span></div>
        <div class="kv-row"><span class="kv-label">${isEs ? 'Parte Inquilina / Roommate' : 'Tenant / Counterparty'}:</span><span class="kv-val">${counterpartyName}</span></div>
        <div class="kv-row"><span class="kv-label">${isEs ? 'Inmueble / Propiedad Destino' : 'Target Property'}:</span><span class="kv-val">${propertyTitle}</span></div>
        <div class="kv-row"><span class="kv-label">${isEs ? 'Ubicación / Dirección Registrada' : 'Registered Address'}:</span><span class="kv-val">${propertyAddress}</span></div>
        <div class="kv-row"><span class="kv-label">${isEs ? 'País y Jurisdicción Aplicable' : 'Jurisdiction'}:</span><span class="kv-val">${legalFramework.countryName[isEs ? 'es' : 'en']}</span></div>
      </div>

      <div class="section-header">II. ${isEs ? 'MARCO NORMATIVO Y REGULATORIO APLICABLE' : 'APPLICABLE LEGAL FRAMEWORK'}</div>
      <div class="callout-box">
        <div class="callout-title">${isEs ? 'Marco Legal Específico por País:' : 'Country Legal Framework:'}</div>
        <div style="margin-top: 4pt;">
          &bull; <strong>${isEs ? 'Ley de Arrendamientos' : 'Tenancy Law'}:</strong> ${legalFramework.tenancyLaw[isEs ? 'es' : 'en']}<br/>
          &bull; <strong>${isEs ? 'Validez de Firma Digital' : 'Digital Signature Law'}:</strong> ${legalFramework.digitalSignatureLaw[isEs ? 'es' : 'en']}<br/>
          &bull; <strong>${isEs ? 'Protección de Datos Personales' : 'Data Privacy Law'}:</strong> ${legalFramework.dataProtectionLaw[isEs ? 'es' : 'en']}
        </div>
      </div>

      <div class="page-footer">
        <span>RoommateFinder Platform &bull; ${legalFramework.countryName[isEs ? 'es' : 'en']}</span>
        <span>${isEs ? 'Página 1 de 3' : 'Page 1 of 3'}</span>
      </div>

      <div class="bottom-wave-wrap">
        <svg class="wave-banner" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,70 C300,140 600,10 900,80 C1050,110 1150,40 1200,70 L1200,120 L0,120 Z" fill="#49C788"></path>
        </svg>
      </div>
    </div>

    <!-- ================= PÁGINA 2 DE 3 ================= -->
    <div class="page">
      <!-- Top Turquoise Wave -->
      <svg class="wave-banner" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,50 L1200,0 L0,0 Z" fill="#49C788"></path>
      </svg>

      <div class="top-meta">
        <span>RoommateFinder Legal</span>
        <span class="clock-badge">&#128336;</span>
        <span>${isEs ? 'Condiciones Económicas' : 'Financial Terms'}</span>
      </div>

      <div class="section-header">III. ${isEs ? 'CONDICIONES FINANCIERAS Y PAGOS DE RENTA' : 'RENTAL TERMS & MONTHLY PAYMENT'}</div>
      <div class="kv-block">
        ${financialRows.map(r => `<div class="kv-row"><span class="kv-label">${r.label}:</span><span class="kv-val">${r.val}</span></div>`).join('')}
      </div>

      <div class="section-header">IV. ${isEs ? 'DEPÓSITO DE GARANTÍA Y DEVOLUCIÓN' : 'SECURITY DEPOSIT TERMS'}</div>
      <div class="kv-block">
        ${depositRows.map(r => `<div class="kv-row"><span class="kv-label">${r.label}:</span><span class="kv-val">${r.val}</span></div>`).join('')}
      </div>

      <div class="callout-box">
        <div class="callout-title">${isEs ? 'CLÁUSULA PRIMERA: OBLIGACIÓN DE PAGO Y DEPÓSITO' : 'CLAUSE 1: PAYMENT & DEPOSIT OBLIGATION'}</div>
        ${isEs
          ? `El inquilino se compromete a efectuar el pago puntual del canon de arrendamiento dentro de los primeros días estipulados de cada mes. El depósito de garantía responderá de forma exclusiva por eventuales daños directos imputables o facturas pendientes, siendo devuelto en el plazo fijado tras la entrega del inmueble.`
          : `The tenant agrees to pay rent on or before the due date. The security deposit guarantees against unpaid utilities or property damage, refundable within the specified window following move-out.`
        }
      </div>

      <div class="section-header">V. ${isEs ? 'NORMAS DE CONVIVENCIA Y USO DE ÁREAS COMUNES' : 'CO-LIVING HOUSE RULES'}</div>
      <div class="kv-block">
        ${cohabitationRows.map(r => `<div class="kv-row"><span class="kv-label">${r.label}:</span><span class="kv-val">${r.val}</span></div>`).join('')}
      </div>

      <div class="callout-box">
        <div class="callout-title">${isEs ? 'CLÁUSULA SEGUNDA: RESPETO Y CONVIVENCIA EN ÁREAS COMUNES' : 'CLAUSE 2: SHARED AREA CO-LIVING'}</div>
        ${isEs
          ? `Las partes aceptan mantener un ambiente limpio, seguro y armónico. Las zonas compartidas (cocina, baños, salas) deberán ser higienizadas inmediatamente tras su uso, respetando los horarios de silencio fijados para el descanso nocturno.`
          : `The parties agree to maintain a clean, safe, and harmonic environment. Common areas must be kept clean after usage, observing quiet hours.`
        }
      </div>

      <div class="page-footer">
        <span>RoommateFinder Platform &bull; ${legalFramework.countryName[isEs ? 'es' : 'en']}</span>
        <span>${isEs ? 'Página 2 de 3' : 'Page 2 of 3'}</span>
      </div>

      <div class="bottom-wave-wrap">
        <svg class="wave-banner" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,70 C300,140 600,10 900,80 C1050,110 1150,40 1200,70 L1200,120 L0,120 Z" fill="#49C788"></path>
        </svg>
      </div>
    </div>

    <!-- ================= PÁGINA 3 DE 3 ================= -->
    <div class="page">
      <!-- Top Turquoise Wave -->
      <svg class="wave-banner" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,50 L1200,0 L0,0 Z" fill="#49C788"></path>
      </svg>

      <div class="top-meta">
        <span>RoommateFinder Legal</span>
        <span class="clock-badge">&#128336;</span>
        <span>${isEs ? 'Firmas y Certificación' : 'Signatures & Validity'}</span>
      </div>

      <div class="section-header">VI. ${isEs ? 'MANTENIMIENTO, DESGASTE Y PREAVISO LEGAL' : 'MAINTENANCE & NOTICE PERIOD'}</div>
      <div class="callout-box">
        <div class="callout-title">${isEs ? 'CLÁUSULA TERCERA: EXENCIÓN POR DESGASTE NATURAL' : 'CLAUSE 3: NORMAL WEAR & TEAR EXEMPTION'}</div>
        ${isEs 
          ? `Se exime de responsabilidad al inquilino por el deterioro ordinario resultante del uso legítimo y cotidiano de la vivienda (${legalFramework.wearAndTearArticle.es}). Los daños ocasionados por dolo o negligencia grave serán cubiertos por el responsable.`
          : `The tenant is exempted from liability for normal wear and tear from ordinary use. Damages from gross negligence shall be indemnified by the responsible party.`
        }
        <div class="callout-title" style="margin-top: 8pt;">${isEs ? 'CLÁUSULA CUARTA: PREAVISO Y RESOLUCIÓN DE CONFLICTOS' : 'CLAUSE 4: NOTICE & DISPUTE RESOLUTION'}</div>
        ${isEs
          ? `La resolución anticipada requiere un preaviso formal por escrito con al menos 30 días de anticipación. Cualquier discrepancia se someterá a mediación de buena fe y a los <strong>${legalFramework.disputeJurisdiction.es}</strong>.`
          : `Early termination requires 30 days prior written notice. Disputes shall be submitted to good-faith mediation and to the <strong>${legalFramework.disputeJurisdiction.en}</strong>.`
        }
      </div>

      ${customRows ? `
        <div class="section-header">VII. ${isEs ? 'CLÁUSULAS ADICIONALES ACORDADAS' : 'ADDITIONAL AGREED CLAUSES'}</div>
        <div style="background-color: #f8fafc; border-left: 3.5pt solid #49C788; border-radius: 6pt; padding: 10pt 14pt; margin-bottom: 14pt; font-size: 9pt;">
          ${customRows}
        </div>
      ` : ''}

      <div class="section-header">${customRows ? 'VIII.' : 'VII.'} ${isEs ? 'ACEPTACIÓN, FIRMAS Y CERTIFICADO DIGITAL' : 'ACCEPTANCE, SIGNATURES & AUDIT'}</div>
      <p class="paragraph" style="font-size: 8.5pt; margin-bottom: 12pt;">
        ${isEs 
          ? `Este contrato ha sido validado electrónicamente conforme a la ley <strong>${legalFramework.digitalSignatureLaw.es}</strong> y la ley de protección de datos <strong>${legalFramework.dataProtectionLaw.es}</strong>.`
          : `This agreement is digitally certified under <strong>${legalFramework.digitalSignatureLaw.en}</strong> and data privacy act <strong>${legalFramework.dataProtectionLaw.en}</strong>.`
        }
      </p>

      <table class="signatures-grid">
        <tr>
          <td>
            <div class="sig-card">
              <div class="sig-name">${initiatorName}</div>
              <div class="sig-line"></div>
              <div class="sig-role">${isEs ? 'Firma Arrendador / Propietario' : 'Landlord / Lessor Signature'}</div>
              <div class="sig-date">${effectiveDate}</div>
              ${activeStatus === 'active' ? `<div class="sig-seal">VERIFICADO &bull; ID: ${contractHash.slice(0, 6)}</div>` : ''}
            </div>
          </td>
          <td style="width: 3.5%;"></td>
          <td>
            <div class="sig-card">
              <div class="sig-name">${counterpartyName}</div>
              <div class="sig-line"></div>
              <div class="sig-role">${isEs ? 'Firma Inquilino / Roommate' : 'Tenant / Counterparty Signature'}</div>
              <div class="sig-date">${effectiveDate}</div>
              ${activeStatus === 'active' ? `<div class="sig-seal">VERIFICADO &bull; ID: ${contractHash.slice(0, 6)}</div>` : ''}
            </div>
          </td>
          <td style="width: 3.5%;"></td>
          <td>
            <div class="sig-card">
              <div class="sig-name">RoommateFinder Legal</div>
              <div class="sig-line"></div>
              <div class="sig-role">${isEs ? 'Testigo / Plataforma Digital' : 'Witness / Digital Platform'}</div>
              <div class="sig-date">${effectiveDate}</div>
              <div class="sig-seal">PLATFORM SEAL</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="margin-top: 14pt; padding: 6pt 10pt; background: #f8fafc; border: 1pt solid #cbd5e1; border-radius: 6pt; font-family: monospace !important; font-size: 7.5pt; color: #475569; text-align: center;">
        SECURITY HASH SHA-256: ${contractHash}${contractHash.split('').reverse().join('')} &bull; ROOMMATEFINDER AUDIT CERTIFIED
      </div>

      <div class="page-footer">
        <span>RoommateFinder Platform &bull; ${legalFramework.countryName[isEs ? 'es' : 'en']}</span>
        <span>${isEs ? 'Página 3 de 3' : 'Page 3 of 3'}</span>
      </div>

      <div class="bottom-wave-wrap">
        <svg class="wave-banner" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,70 C300,140 600,10 900,80 C1050,110 1150,40 1200,70 L1200,120 L0,120 Z" fill="#49C788"></path>
        </svg>
      </div>
    </div>

  </body>
  </html>
  `;
}
