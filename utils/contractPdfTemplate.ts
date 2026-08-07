import { detectCountryCode, getLegalFramework } from '@/constants/legalFrameworks';

/**
 * ============================================================================
 * PLANTILLA Y CONFIGURACIÓN MAESTRA DE CONTRATOS PDF (RoommateFinder Platform)
 * ============================================================================
 * Esta función genera el código HTML completo con un diseño moderno, minimalista
 * y de alto nivel visual para exportar contratos en formato PDF (3 Páginas).
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
  
  // Detect country framework selected or inferred from address
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
  const statusStr = (activeStatus || contractData?.status || 'draft').toUpperCase();

  const rentAmount = c.rent ? `$${c.rent.amount}` : '$1,080';
  const rentCurrency = c.rent?.currency || 'USD';
  const rentDueDay = c.rent?.due_day ? `${isEs ? 'Día' : 'Day'} ${c.rent.due_day}` : (isEs ? 'Día 1' : 'Day 1');
  const lateFee = c.rent?.late_fee ? `$${c.rent.late_fee} USD` : (isEs ? 'Sujeto a interés legal' : 'Legal interest');
  const depositAmount = c.security_deposit ? `$${c.security_deposit.amount} USD` : '$1,080 USD';
  const depositReturnDays = c.security_deposit?.return_days ? `${c.security_deposit.return_days} ${isEs ? 'días hábiles' : 'business days'}` : (isEs ? '15 días hábiles' : '15 business days');

  const cohabitationList = isEs ? [
    { tag: 'Mascotas', val: c.pets?.allowed ? 'Permitidas bajo supervisión' : 'No permitidas en interiores', status: c.pets?.allowed ? 'allowed' : 'denied' },
    { tag: 'Tabaco / Fumar', val: c.smoking?.allowed ? 'Permitido en exteriores' : 'Prohibido en áreas cerradas', status: c.smoking?.allowed ? 'warning' : 'denied' },
    { tag: 'Invitados Nocturnos', val: c.visitors?.overnight_allowed ? `Permitido (máx. ${c.visitors.max_nights || 3} noches)` : 'No permitido sin aviso', status: 'allowed' },
    { tag: 'Horario de Silencio', val: c.noise ? `${c.noise.quiet_hours_start} a ${c.noise.quiet_hours_end}` : '10:00 PM a 07:00 AM', status: 'info' },
    { tag: 'Limpieza Compartida', val: c.cleaning?.schedule === 'daily' ? 'Rotación diaria' : c.cleaning?.schedule === 'weekly' ? 'Rotación semanal equitativa' : 'Rotación quincenal', status: 'info' },
  ] : [
    { tag: 'Pet Policy', val: c.pets?.allowed ? 'Allowed under supervision' : 'Not allowed indoors', status: c.pets?.allowed ? 'allowed' : 'denied' },
    { tag: 'Smoking Policy', val: c.smoking?.allowed ? 'Allowed outdoors' : 'Prohibited indoors', status: c.smoking?.allowed ? 'warning' : 'denied' },
    { tag: 'Overnight Guests', val: c.visitors?.overnight_allowed ? `Allowed (max ${c.visitors.max_nights || 3} nights)` : 'Requires prior notice', status: 'allowed' },
    { tag: 'Quiet Hours', val: c.noise ? `${c.noise.quiet_hours_start} to ${c.noise.quiet_hours_end}` : '10:00 PM to 07:00 AM', status: 'info' },
    { tag: 'Cleaning Rotation', val: c.cleaning?.schedule === 'daily' ? 'Daily rotation' : c.cleaning?.schedule === 'weekly' ? 'Weekly rotation' : 'Biweekly', status: 'info' },
  ];

  const customClausesBadges = (contractData?.selected_custom_clauses || []).map((key: string) => `
    <div class="custom-badge">&check; ${getOptionalClauseLabel(key, locale)}</div>
  `).join('');

  return `
  <!DOCTYPE html>
  <html lang="${locale}">
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
        background: #f8fafc; 
        color: #0f172a; 
        font-family: Arial, Helvetica, sans-serif !important;
        -webkit-font-smoothing: antialiased;
      }
      
      .page {
        width: 612pt;
        height: 792pt;
        padding: 28pt 36pt 32pt 36pt;
        position: relative;
        overflow: hidden;
        background: #ffffff;
        page-break-after: always;
        page-break-inside: avoid;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      .page:last-child {
        page-break-after: avoid;
      }

      /* ----------------------------------------------------
         LUXURY MODERN HEADER BAR (APP BRANDED)
      ---------------------------------------------------- */
      .hero-header {
        background: linear-gradient(135deg, #0b0f17 0%, #161b26 100%);
        color: #ffffff;
        border-radius: 10pt;
        padding: 14pt 18pt;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14pt;
        border-left: 5pt solid #49C788;
        box-shadow: 0 4pt 12pt rgba(0,0,0,0.08);
      }
      .brand-group {
        display: flex;
        flex-direction: column;
      }
      .brand-title {
        font-size: 16pt;
        font-weight: bold;
        color: #ffffff;
        letter-spacing: -0.4pt;
      }
      .brand-green {
        color: #49C788;
      }
      .brand-sub {
        font-size: 8pt;
        color: #94a3b8;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.8pt;
        margin-top: 2pt;
      }
      .header-right {
        text-align: right;
      }
      .ref-tag {
        font-size: 8pt;
        font-family: monospace;
        color: #cbd5e1;
        background: rgba(255,255,255,0.1);
        padding: 2pt 6pt;
        border-radius: 4pt;
      }
      .status-pill {
        display: inline-block;
        background: #49C788;
        color: #0b0f17;
        padding: 2.5pt 10pt;
        border-radius: 20pt;
        font-size: 7.5pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-top: 4pt;
        letter-spacing: 0.5pt;
      }

      /* ----------------------------------------------------
         HEADINGS & TITLES (APA 7 STYLED & MODERN ACCENTS)
      ---------------------------------------------------- */
      .doc-main-title {
        font-size: 13.5pt;
        font-weight: bold;
        text-align: center;
        color: #0b0f17;
        margin-bottom: 14pt;
        text-transform: uppercase;
        letter-spacing: 0.6pt;
      }

      .section-heading {
        font-size: 9.5pt;
        font-weight: bold;
        color: #0b0f17;
        margin-top: 10pt;
        margin-bottom: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
        display: flex;
        align-items: center;
        gap: 6pt;
      }
      .section-heading::before {
        content: '';
        display: inline-block;
        width: 4pt;
        height: 11pt;
        background: #49C788;
        border-radius: 2pt;
      }

      /* ----------------------------------------------------
         DASHBOARD WIDGETS & FEATURE CARDS
      ---------------------------------------------------- */
      .stat-banner {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10pt;
        margin-bottom: 12pt;
      }
      .stat-card {
        background: #f0fdf4;
        border: 1.5pt solid #49C788;
        border-radius: 8pt;
        padding: 10pt 14pt;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .stat-label {
        font-size: 8pt;
        font-weight: bold;
        color: #047857;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 14pt;
        font-weight: bold;
        color: #0b0f17;
      }

      .card-box {
        background: #ffffff;
        border: 1pt solid #e2e8f0;
        border-radius: 8pt;
        padding: 10pt 14pt;
        margin-bottom: 10pt;
        box-shadow: 0 2pt 6pt rgba(0,0,0,0.02);
      }
      .card-accent {
        background: #f8fafc;
        border-left: 4pt solid #49C788;
      }

      .parties-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10pt;
        margin-bottom: 12pt;
      }
      .party-tile {
        background: #ffffff;
        border: 1.5pt solid #0b0f17;
        border-radius: 8pt;
        padding: 10pt 12pt;
        position: relative;
      }
      .party-badge {
        font-size: 7pt;
        font-weight: bold;
        color: #49C788;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
        margin-bottom: 3pt;
      }
      .party-name-txt {
        font-size: 11pt;
        font-weight: bold;
        color: #0b0f17;
      }
      .party-verified {
        font-size: 7.5pt;
        color: #047857;
        font-weight: bold;
        margin-top: 4pt;
        display: flex;
        align-items: center;
        gap: 3pt;
      }

      /* ----------------------------------------------------
         APA 7 PARAGRAPHS & ROWS
      ---------------------------------------------------- */
      .apa-text {
        font-size: 8.5pt;
        line-height: 1.8;
        color: #334155;
        text-align: justify;
        margin-bottom: 8pt;
      }

      .data-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5pt 0;
        border-bottom: 1pt dashed #e2e8f0;
        font-size: 8.5pt;
      }
      .data-row:last-child {
        border-bottom: none;
      }
      .data-label {
        color: #64748b;
        font-weight: bold;
      }
      .data-value {
        color: #0b0f17;
        font-weight: bold;
      }

      /* ----------------------------------------------------
         CO-LIVING HOUSE RULES GRID
      ---------------------------------------------------- */
      .rules-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8pt;
        margin-bottom: 10pt;
      }
      .rule-card {
        background: #ffffff;
        border: 1pt solid #e2e8f0;
        border-radius: 6pt;
        padding: 8pt 10pt;
      }
      .rule-header {
        font-size: 8pt;
        font-weight: bold;
        color: #49C788;
        text-transform: uppercase;
        margin-bottom: 2pt;
      }
      .rule-desc {
        font-size: 8.5pt;
        font-weight: bold;
        color: #0b0f17;
      }

      /* ----------------------------------------------------
         CUSTOM CLAUSES CHIPS
      ---------------------------------------------------- */
      .custom-chips-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 6pt;
        margin-top: 4pt;
      }
      .custom-badge {
        background: #ecfdf5;
        border: 1pt solid #a7f3d0;
        color: #047857;
        font-size: 8pt;
        font-weight: bold;
        padding: 4pt 8pt;
        border-radius: 6pt;
      }

      /* ----------------------------------------------------
         EXECUTIVE SIGNATURE CARDS (3 COLUMNS)
      ---------------------------------------------------- */
      .signatures-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10pt;
        margin-top: 12pt;
        margin-bottom: 12pt;
      }
      .signature-card {
        border: 1.5pt solid #0b0f17;
        border-radius: 8pt;
        padding: 10pt 8pt;
        background: #ffffff;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 122pt;
        box-shadow: 0 2pt 4pt rgba(0,0,0,0.03);
      }
      .sig-role-title {
        font-size: 7.5pt;
        font-weight: bold;
        color: #49C788;
        text-transform: uppercase;
      }
      .sig-person-name {
        font-size: 9.5pt;
        font-weight: bold;
        color: #0b0f17;
        margin-top: 4pt;
      }
      .sig-line-bar {
        border-bottom: 1.5pt solid #0b0f17;
        margin: 14pt 10pt 6pt 10pt;
      }
      .sig-verified-pill {
        font-size: 7pt;
        font-weight: bold;
        color: #047857;
        background: #ecfdf5;
        border: 1pt solid #a7f3d0;
        padding: 2.5pt 6pt;
        border-radius: 4pt;
        display: inline-block;
      }

      /* ----------------------------------------------------
         AUDIT SECURITY FOOTER CARD
      ---------------------------------------------------- */
      .audit-card {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 1.5pt solid #cbd5e1;
        border-radius: 8pt;
        padding: 8pt 12pt;
        text-align: center;
        margin-top: 4pt;
      }
      .audit-title {
        font-size: 8pt;
        font-weight: bold;
        color: #0b0f17;
      }
      .audit-hash {
        font-family: monospace;
        font-size: 7.5pt;
        color: #047857;
        font-weight: bold;
        margin-top: 2pt;
        letter-spacing: 0.5pt;
      }
      .audit-law {
        font-size: 6.5pt;
        color: #64748b;
        margin-top: 2pt;
      }

      /* ----------------------------------------------------
         PAGE FOOTER
      ---------------------------------------------------- */
      .page-footer-bar {
        margin-top: auto;
        padding-top: 10pt;
        border-top: 1.5pt solid #0b0f17;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8pt;
        color: #64748b;
        font-weight: bold;
      }
      .footer-accent {
        color: #49C788;
      }
    </style>
  </head>
  <body>

    <!-- ================= PÁGINA 1 DE 3 ================= -->
    <div class="page">
      <div class="hero-header">
        <div class="brand-group">
          <div class="brand-title">Roommate<span class="brand-green">Finder</span></div>
          <div class="brand-sub">${isEs ? 'Sistema Legal de Contratación Habitacional' : 'Residential Lease Legal System'}</div>
        </div>
        <div class="header-right">
          <div class="ref-tag">HASH ID: ${contractHash.slice(0, 10)}</div>
          <div class="status-pill">${statusStr}</div>
        </div>
      </div>

      <div class="doc-main-title">${getContractTypeLabel(contractData?.type, locale)}</div>

      <!-- Banner Estadístico de Renta & Vigencia -->
      <div class="stat-banner">
        <div class="stat-card">
          <div>
            <div class="stat-label">${isEs ? 'CANON DE RENTA MENSUAL' : 'MONTHLY RENT'}</div>
            <div class="stat-value">${rentAmount} <span style="font-size:9pt; color:#047857;">${rentCurrency}</span></div>
          </div>
          <div style="font-size:8pt; font-weight:bold; color:#047857; background:#dcfce7; padding:4pt 8pt; border-radius:6pt;">
            ${rentDueDay}
          </div>
        </div>
        <div class="stat-card" style="background:#f0f9ff; border-color:#0284c7;">
          <div>
            <div class="stat-label" style="color:#0369a1;">${isEs ? 'INICIO DE VIGENCIA' : 'EFFECTIVE START'}</div>
            <div class="stat-value" style="font-size:11pt;">${effectiveDate}</div>
          </div>
          <div style="font-size:7.5pt; font-weight:bold; color:#0369a1; background:#e0f2fe; padding:4pt 6pt; border-radius:6pt;">
            ${isEs ? 'VIGENCIA 1 AÑO' : '1 YEAR LEASE'}
          </div>
        </div>
      </div>

      <!-- Partes Contratantes -->
      <div class="section-heading">I. ${isEs ? 'IDENTIFICACIÓN DE LAS PARTES CONTRATANTES' : 'CONTRACTING PARTIES IDENTIFICATION'}</div>
      <div class="parties-grid">
        <div class="party-tile">
          <div class="party-badge">${isEs ? 'PARTE ARRENDADORA / PROPIETARIO' : 'LESSOR / LANDLORD'}</div>
          <div class="party-name-txt">${initiatorName}</div>
          <div class="party-verified">&check; ${isEs ? 'Identidad digital verificada' : 'Verified digital identity'}</div>
        </div>
        <div class="party-tile">
          <div class="party-badge">${isEs ? 'PARTE INQUILINA / ROOMMATE' : 'TENANT / ROOMMATE'}</div>
          <div class="party-name-txt">${counterpartyName}</div>
          <div class="party-verified">&check; ${isEs ? 'Identidad digital verificada' : 'Verified digital identity'}</div>
        </div>
      </div>

      <!-- Ficha de la Propiedad -->
      <div class="section-heading">II. ${isEs ? 'UBICACIÓN Y FICHA REGISTRADA DEL INMUEBLE' : 'PROPERTY LOCATION & REGISTERED DETAILS'}</div>
      <div class="card-box card-accent">
        <div class="data-row">
          <span class="data-label">${isEs ? 'Propiedad Residencial' : 'Target Property'}:</span>
          <span class="data-value">${propertyTitle}</span>
        </div>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Dirección Registrada' : 'Registered Address'}:</span>
          <span class="data-value">${propertyAddress}</span>
        </div>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Fecha de Inicio' : 'Start Date'}:</span>
          <span class="data-value">${effectiveDate}</span>
        </div>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Vencimiento Estimado' : 'Estimated End Date'}:</span>
          <span class="data-value">${endDateFormatted}</span>
        </div>
      </div>

      <!-- Objeto del Contrato & Marco Legal -->
      <div class="section-heading">III. ${isEs ? 'OBJETO DEL CONTRATO Y MARCO NORMATIVO LEGAL' : 'CONTRACT PURPOSE & LEGAL FRAMEWORK'}</div>
      <div class="card-box">
        <p class="apa-text">
          ${isEs 
            ? `El presente instrumento constituye un contrato privado formal de arrendamiento habitacional y acuerdo de convivencia en modalidad co-living celebrados a través de <strong>RoommateFinder</strong>. Las partes se someten a la legislación aplicable en <strong>${legalFramework.countryName.es}</strong>:`
            : `This agreement represents a formal lease and co-living contract executed via <strong>RoommateFinder</strong> under the laws of <strong>${legalFramework.countryName.en}</strong>:`
          }
        </p>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Ley de Arrendamiento' : 'Tenancy Law'}:</span>
          <span class="data-value">${legalFramework.tenancyLaw[isEs ? 'es' : 'en']}</span>
        </div>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Ley de Firma Electrónica' : 'Digital Signature Law'}:</span>
          <span class="data-value">${legalFramework.digitalSignatureLaw[isEs ? 'es' : 'en']}</span>
        </div>
      </div>

      <div class="page-footer-bar">
        <span>RoommateFinder Legal &bull; <span class="footer-accent">${legalFramework.countryName[isEs ? 'es' : 'en']}</span></span>
        <span>${isEs ? 'Página 1 de 3' : 'Page 1 of 3'}</span>
      </div>
    </div>

    <!-- ================= PÁGINA 2 DE 3 ================= -->
    <div class="page">
      <div class="hero-header">
        <div class="brand-group">
          <div class="brand-title">Roommate<span class="brand-green">Finder</span></div>
          <div class="brand-sub">${isEs ? 'Condiciones Económicas y Regulación de Convivencia' : 'Financial & Co-Living Regulations'}</div>
        </div>
        <div class="header-right">
          <div class="ref-tag">HASH ID: ${contractHash.slice(0, 10)}</div>
          <div class="status-pill">${statusStr}</div>
        </div>
      </div>

      <!-- Términos Financieros -->
      <div class="section-heading">IV. ${isEs ? 'CONDICIONES FINANCIERAS Y PAGOS DE RENTA' : 'FINANCIAL TERMS & RENT PAYMENTS'}</div>
      <div class="card-box">
        <div class="data-row">
          <span class="data-label">${isEs ? 'Canon de Renta Mensual' : 'Monthly Rent'}:</span>
          <span class="data-value" style="color:#047857;">${rentAmount} ${rentCurrency}</span>
        </div>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Día Límite de Pago Exigible' : 'Rent Due Day'}:</span>
          <span class="data-value">${rentDueDay} ${isEs ? 'de cada mes' : 'of each month'}</span>
        </div>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Recargo por Morosidad Exigible' : 'Late Payment Fee'}:</span>
          <span class="data-value">${lateFee}</span>
        </div>
      </div>

      <!-- Depósito de Garantía -->
      <div class="section-heading">V. ${isEs ? 'DEPÓSITO DE GARANTÍA Y DEVOLUCIÓN' : 'SECURITY DEPOSIT & REFUND'}</div>
      <div class="card-box">
        <div class="data-row">
          <span class="data-label">${isEs ? 'Monto del Depósito de Garantía' : 'Security Deposit Amount'}:</span>
          <span class="data-value">${depositAmount}</span>
        </div>
        <div class="data-row">
          <span class="data-label">${isEs ? 'Plazo de Devolución del Depósito' : 'Deposit Refund Window'}:</span>
          <span class="data-value">${depositReturnDays}</span>
        </div>
      </div>

      <div class="card-box card-accent">
        <p class="apa-text" style="margin-bottom:0;">
          <strong>${isEs ? 'CLÁUSULA PRIMERA (PAGO Y GARANTÍA):' : 'CLAUSE 1 (PAYMENT & DEPOSIT):'}</strong>
          ${isEs 
            ? `La parte inquilina se obliga a cancelar el canon de renta en la fecha límite estipulada. El depósito de garantía responderá exclusivamente por eventuales daños directos imputables o impagos de servicios, siendo restituido íntegramente en el plazo acordado tras la entrega formal de la habitación.`
            : `The tenant agrees to pay rent on or before the due date. The security deposit guarantees against unpaid utilities or property damage caused by negligence, refundable within the specified window following move-out.`
          }
        </p>
      </div>

      <!-- Normas de Convivencia Co-Living -->
      <div class="section-heading">VI. ${isEs ? 'NORMAS DE CO-LIVING Y USO DE ÁREAS COMUNES' : 'CO-LIVING HOUSE RULES & SHARED SPACES'}</div>
      <div class="rules-grid">
        ${cohabitationList.map(item => `
          <div class="rule-card">
            <div class="rule-header">${item.tag}</div>
            <div class="rule-desc">${item.val}</div>
          </div>
        `).join('')}
      </div>

      <div class="card-box">
        <p class="apa-text" style="margin-bottom:0;">
          <strong>${isEs ? 'CLÁUSULA SEGUNDA (CONVIVENCIA Y SILENCIO):' : 'CLAUSE 2 (CO-LIVING HARMONY):'}</strong>
          ${isEs
            ? `Las partes se comprometen a preservar la limpieza y el orden en áreas compartidas (cocina, baños y salas). Se respetará estrictamente el horario de descanso fijado para asegurar la tranquilidad y descanso de todos los habitantes.`
            : `Occupants agree to maintain cleanliness in common areas (kitchen, bathrooms, living room) and strictly observe quiet hours during designated night periods.`
          }
        </p>
      </div>

      <div class="page-footer-bar">
        <span>RoommateFinder Legal &bull; <span class="footer-accent">${legalFramework.countryName[isEs ? 'es' : 'en']}</span></span>
        <span>${isEs ? 'Página 2 de 3' : 'Page 2 of 3'}</span>
      </div>
    </div>

    <!-- ================= PÁGINA 3 DE 3 ================= -->
    <div class="page">
      <div class="hero-header">
        <div class="brand-group">
          <div class="brand-title">Roommate<span class="brand-green">Finder</span></div>
          <div class="brand-sub">${isEs ? 'Cláusulas Legales, Firmas y Auditoría Digital' : 'Legal Clauses, Signatures & Digital Audit'}</div>
        </div>
        <div class="header-right">
          <div class="ref-tag">HASH ID: ${contractHash.slice(0, 10)}</div>
          <div class="status-pill">${statusStr}</div>
        </div>
      </div>

      <!-- Cláusulas Legales Especiales -->
      <div class="section-heading">VII. ${isEs ? 'EXENCIÓN POR DESGASTE NATURAL Y PREAVISO LEGAL' : 'LEGAL NOTICE & NORMAL WEAR & TEAR'}</div>
      <div class="card-box">
        <p class="apa-text">
          <strong>${isEs ? 'CLÁUSULA TERCERA (DESGASTE NATURAL):' : 'CLAUSE 3 (NORMAL WEAR & TEAR):'}</strong>
          ${isEs 
            ? `Se exonera expresamente a la parte inquilina de responsabilidad por el deterioro ordinario resultante del uso legítimo y cotidiano del inmueble (${legalFramework.wearAndTearArticle.es}). Los daños originados por mal uso o negligencia grave serán asumidos por la parte responsable.`
            : `The tenant is exempted from liability for normal wear and tear from ordinary use (${legalFramework.wearAndTearArticle.en}). Damages caused by gross negligence shall be indemnified by the responsible party.`
          }
        </p>
        <p class="apa-text" style="margin-bottom:0;">
          <strong>${isEs ? 'CLÁUSULA CUARTA (PREAVISO Y JURISDICCIÓN):' : 'CLAUSE 4 (NOTICE & JURISDICTION):'}</strong>
          ${isEs
            ? `La terminación anticipada del contrato requerirá una notificación escrita con al menos 30 días de anticipación. Cualquier discrepancia se someterá a mediación de buena fe y a la jurisdicción de los <strong>${legalFramework.disputeJurisdiction.es}</strong>.`
            : `Early termination requires 30 days prior written notice. Disputes shall be submitted to mediation and to the <strong>${legalFramework.disputeJurisdiction.en}</strong>.`
          }
        </p>
      </div>

      ${customClausesBadges ? `
        <div class="section-heading">VIII. ${isEs ? 'CLÁUSULAS ADICIONALES ACORDADAS' : 'ADDITIONAL AGREED CLAUSES'}</div>
        <div class="card-box">
          <div class="custom-chips-wrap">
            ${customClausesBadges}
          </div>
        </div>
      ` : ''}

      <!-- Cuadro de Firmas (3 Columnas) -->
      <div class="section-heading">IX. ${isEs ? 'ACEPTACIÓN Y FIRMAS ELECTRÓNICAS VERIFICADAS' : 'ACCEPTANCE & VERIFIED DIGITAL SIGNATURES'}</div>
      <div class="signatures-row">
        <div class="signature-card">
          <div>
            <div class="sig-role-title">${isEs ? 'ARRENDADOR / PROPIETARIO' : 'LESSOR / LANDLORD'}</div>
            <div class="sig-person-name">${initiatorName}</div>
          </div>
          <div>
            <div class="sig-line-bar"></div>
            <div class="sig-verified-pill">&check; ${isEs ? 'FIRMA VERIFICADA' : 'VERIFIED'} &bull; ${effectiveDate}</div>
          </div>
        </div>

        <div class="signature-card">
          <div>
            <div class="sig-role-title">${isEs ? 'INQUILINO / ROOMMATE' : 'TENANT / ROOMMATE'}</div>
            <div class="sig-person-name">${counterpartyName}</div>
          </div>
          <div>
            <div class="sig-line-bar"></div>
            <div class="sig-verified-pill">&check; ${isEs ? 'FIRMA VERIFICADA' : 'VERIFIED'} &bull; ${effectiveDate}</div>
          </div>
        </div>

        <div class="signature-card">
          <div>
            <div class="sig-role-title">${isEs ? 'CERTIFICACIÓN PLATAFORMA' : 'PLATFORM WITNESS'}</div>
            <div class="sig-person-name">RoommateFinder</div>
          </div>
          <div>
            <div class="sig-line-bar"></div>
            <div class="sig-verified-pill" style="color: #0284c7; background: #f0f9ff; border-color: #bae6fd;">AUDIT SEAL</div>
          </div>
        </div>
      </div>

      <!-- Sello de Auditoría Criptográfica -->
      <div class="audit-card">
        <div class="audit-title">${isEs ? 'CERTIFICADO DE AUDITORÍA Y VALIDEZ DIGITAL (SHA-256)' : 'DIGITAL AUDIT CERTIFICATE (SHA-256)'}</div>
        <div class="audit-hash">${contractHash}${contractHash.split('').reverse().join('')}</div>
        <div class="audit-law">${isEs ? 'Documento electrónico con validez jurídica formal conforme a la ley' : 'Electronic document with legal force under law'} ${legalFramework.digitalSignatureLaw[isEs ? 'es' : 'en']}</div>
      </div>

      <div class="page-footer-bar">
        <span>RoommateFinder Legal &bull; <span class="footer-accent">${legalFramework.countryName[isEs ? 'es' : 'en']}</span></span>
        <span>${isEs ? 'Página 3 de 3' : 'Page 3 of 3'}</span>
      </div>
    </div>

  </body>
  </html>
  `;
}
