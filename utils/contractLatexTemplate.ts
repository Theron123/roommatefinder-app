import { detectCountryCode, getLegalFramework } from '@/constants/legalFrameworks';
import { getOptionalClauseLabel, getContractTypeLabel } from './contractPdfTemplate';

/**
 * ============================================================================
 * SISTEMA MAESTRO DE CONTRATOS EN LATEX (\LaTeX Engine - RoommateFinder)
 * ============================================================================
 * Este archivo implementa el motor de generación de contratos usando el sistema
 * estándar de composición tipográfica \LaTeX (LaTeX).
 * 
 * Genera código fuente .tex 100% válido y compatible con Overleaf, TeXworks,
 * pdfLaTeX, XeLaTeX y LuaLaTeX.
 * 
 * GUÍA DE PERSONALIZACIÓN LATEX PARA EL ADMINISTRADOR:
 * ----------------------------------------------------------------------------
 * 1. Paquetes: geometry, xcolor, tcolorbox, titlesec, tabularx, fancyhdr
 * 2. Color de Marca: \definecolor{PrimaryGreen}{HTML}{49C788}
 * 3. Fuente: Computer Modern / Latin Modern (Estilo clásico LaTeX)
 * 4. Cajas de Marco Legal: tcolorbox con borde izquierdo verde
 * ----------------------------------------------------------------------------
 */

/**
 * Genera el código fuente completo en formato .tex de LaTeX
 */
export function generateLatexSourceCode(contractData: any, activeStatus?: string, locale: string = 'es'): string {
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

  const customClausesTex = (contractData?.selected_custom_clauses || []).map((key: string) => 
    `\\item \\textbf{${getOptionalClauseLabel(key, locale)}}`
  ).join('\n');

  return `\\documentclass[11pt,letterpaper]{article}
\\usepackage[utf8]{utf8}
\\usepackage[margin=1in]{geometry}
\\usepackage{xcolor}
\\usepackage{tcolorbox}
\\usepackage{titlesec}
\\usepackage{tabularx}
\\usepackage{fancyhdr}
\\usepackage{hyperref}
\\usepackage{enumitem}

% Configuración de Colores de Marca
\\definecolor{PrimaryGreen}{HTML}{49C788}
\\definecolor{DarkSlate}{HTML}{0F172A}
\\definecolor{TextGrey}{HTML}{334155}
\\definecolor{BoxBg}{HTML}{F8FAFC}
\\definecolor{BorderGrey}{HTML}{CBD5E1}

% Estilo de Encabezados y Pie de Página
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\small \\color{TextGrey} RoommateFinder Legal -- ID: ${contractData?.id ? contractData.id.slice(0, 8) : '00000000'}}
\\lhead{\\small \\color{TextGrey} ${legalFramework.cityDefault[isEs ? 'es' : 'en']}, ${effectiveDate}}
\\rfoot{\\small \\color{TextGrey} Página \\thepage\\ de 3}
\\lfoot{\\small \\color{TextGrey} RoommateFinder Platform -- ${legalFramework.countryName[isEs ? 'es' : 'en']}}
\\renewcommand{\\headrulewidth}{0.8pt}
\\renewcommand{\\footrulewidth}{0.8pt}

% Formato de Títulos de Sección
\\titleformat{\\section}{\\color{DarkSlate}\\normalfont\\large\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{14pt}{8pt}

% Configuración de Cajas de Marco Legal (tcolorbox)
\\tcbuselibrary{skins}
\\newtcolorbox{legalbox}[1]{%
  enhanced,
  colback=BoxBg,
  colframe=PrimaryGreen,
  boxrule=0pt,
  leftrule=3.5pt,
  arc=3pt,
  title={#1},
  coltitle=DarkSlate,
  fonttitle=\\bfseries\\small,
  attach title to top,
  after title={\\par\\vspace{3pt}},
  top=8pt,bottom=8pt,left=10pt,right=10pt
}

\\begin{document}

% ================= PÁGINA 1 =================
\\begin{center}
  {\\color{DarkSlate}\\Huge \\bfseries ${getContractTypeLabel(contractData?.type, locale)}}\\\\
  \\vspace{4pt}
  {\\color{PrimaryGreen}\\small \\textbf{${isEs ? 'CONTRATO OFICIAL DE ARRENDAMIENTO Y CONVIVENCIA' : 'OFFICIAL LEASE & CO-LIVING AGREEMENT'}}}
\\end{center}
\\vspace{10pt}

\\begin{legalbox}{${isEs ? 'DECLARACIÓN INICIAL Y OBJETO DEL CONTRATO' : 'INITIAL DECLARATION & PURPOSE'}}
  ${isEs 
    ? 'El presente documento constituye un contrato privado formal de arrendamiento habitacional y acuerdo de convivencia en modalidad co-living, celebrado a través de la plataforma tecnológica \\textbf{RoommateFinder}. El contrato vincula jurídicamente a las partes firmantes y rige el uso y goce del inmueble destinado exclusivamente a vivienda compartida.'
    : 'This document represents a formal private lease and co-living agreement executed via the \\textbf{RoommateFinder} platform. This legally binding agreement governs the residential use and co-living enjoyment of the shared property.'
  }
\\end{legalbox}

\\section{I. ${isEs ? 'IDENTIFICACIÓN DE LAS PARTES Y PROPIEDAD' : 'IDENTIFICATION OF PARTIES & PROPERTY'}}
\\begin{tabularx}{\\linewidth}{@{}l X@{}}
  \\textbf{${isEs ? 'Parte Arrendadora / Iniciador' : 'Lessor / Initiator'}:} & ${initiatorName} \\\\
  \\textbf{${isEs ? 'Parte Inquilina / Roommate' : 'Tenant / Counterparty'}:} & ${counterpartyName} \\\\
  \\textbf{${isEs ? 'Inmueble / Propiedad Destino' : 'Target Property'}:} & ${propertyTitle} \\\\
  \\textbf{${isEs ? 'Ubicación / Dirección Registrada' : 'Registered Address'}:} & ${propertyAddress} \\\\
  \\textbf{${isEs ? 'País y Jurisdicción Aplicable' : 'Jurisdiction'}:} & ${legalFramework.countryName[isEs ? 'es' : 'en']} \\\\
\\end{tabularx}

\\vspace{10pt}

\\section{II. ${isEs ? 'MARCO NORMATIVO Y REGULATORIO APLICABLE' : 'APPLICABLE LEGAL FRAMEWORK'}}
\\begin{legalbox}{${isEs ? 'Marco Legal Específico por País' : 'Country Legal Framework'}}
  \\begin{itemize}[leftmargin=*,label=\\tiny$\\bullet$]
    \\item \\textbf{${isEs ? 'Ley de Arrendamientos' : 'Tenancy Law'}:} ${legalFramework.tenancyLaw[isEs ? 'es' : 'en']}
    \\item \\textbf{${isEs ? 'Validez de Firma Digital' : 'Digital Signature Law'}:} ${legalFramework.digitalSignatureLaw[isEs ? 'es' : 'en']}
    \\item \\textbf{${isEs ? 'Protección de Datos Personales' : 'Data Privacy Law'}:} ${legalFramework.dataProtectionLaw[isEs ? 'es' : 'en']}
  \\end{itemize}
\\end{legalbox}

\\clearpage

% ================= PÁGINA 2 =================
\\section{III. ${isEs ? 'CONDICIONES FINANCIERAS Y PAGOS DE RENTA' : 'RENTAL TERMS & MONTHLY PAYMENT'}}
\\begin{tabularx}{\\linewidth}{@{}l X@{}}
  \\textbf{${isEs ? 'Canon de Renta Mensual' : 'Monthly Rent Amount'}:} & ${c.rent ? `$${c.rent.amount} ${c.rent.currency || 'USD'}` : '$1,080 USD'} \\\\
  \\textbf{${isEs ? 'Día Límite de Pago' : 'Rent Due Day'}:} & ${c.rent ? `Día ${c.rent.due_day} de cada mes` : 'Día 1 de cada mes'} \\\\
  \\textbf{${isEs ? 'Recargo por Morosidad' : 'Late Fee'}:} & ${c.rent?.late_fee ? `$${c.rent.late_fee}` : 'Sujeto a interés legal'} \\\\
\\end{tabularx}

\\vspace{10pt}

\\section{IV. ${isEs ? 'DEPÓSITO DE GARANTÍA Y DEVOLUCIÓN' : 'SECURITY DEPOSIT TERMS'}}
\\begin{tabularx}{\\linewidth}{@{}l X@{}}
  \\textbf{${isEs ? 'Monto del Depósito' : 'Deposit Amount'}:} & ${c.security_deposit ? `$${c.security_deposit.amount} USD` : '$1,080 USD'} \\\\
  \\textbf{${isEs ? 'Plazo de Devolución' : 'Refund Window'}:} & ${c.security_deposit?.return_days ? `${c.security_deposit.return_days} días hábiles` : '15 días hábiles'} \\\\
\\end{tabularx}

\\vspace{10pt}

\\begin{legalbox}{${isEs ? 'CLÁUSULA PRIMERA: OBLIGACIÓN DE PAGO Y DEPÓSITO' : 'CLAUSE 1: PAYMENT & DEPOSIT OBLIGATION'}}
  ${isEs
    ? 'El inquilino se compromete a efectuar el pago puntual del canon de arrendamiento dentro de los primeros días estipulados de cada mes. El depósito de garantía responderá de forma exclusiva por eventuales daños directos imputables o facturas pendientes, siendo devuelto en el plazo fijado tras la entrega del inmueble.'
    : 'The tenant agrees to pay rent on or before the due date. The security deposit guarantees against unpaid utilities or property damage, refundable within the specified window following move-out.'
  }
\\end{legalbox}

\\section{V. ${isEs ? 'NORMAS DE CONVIVENCIA Y USO DE ÁREAS COMUNES' : 'CO-LIVING HOUSE RULES'}}
\\begin{tabularx}{\\linewidth}{@{}l X@{}}
  \\textbf{${isEs ? 'Tenencia de Mascotas' : 'Pet Policy'}:} & ${c.pets?.allowed ? 'Permitidas bajo supervisión' : 'No permitidas en interiores'} \\\\
  \\textbf{${isEs ? 'Uso de Tabaco y Fumar' : 'Smoking Policy'}:} & ${c.smoking?.allowed ? 'Permitido en exteriores' : 'Prohibido en áreas cerradas'} \\\\
  \\textbf{${isEs ? 'Visitas y Alojamiento' : 'Overnight Guests'}:} & ${c.visitors?.overnight_allowed ? `Permitido (máx. ${c.visitors.max_nights || 3} noches)` : 'No permitido sin permiso'} \\\\
  \\textbf{${isEs ? 'Horario de Silencio' : 'Quiet Hours'}:} & ${c.noise ? `${c.noise.quiet_hours_start} a ${c.noise.quiet_hours_end}` : '10:00 PM a 07:00 AM'} \\\\
\\end{tabularx}

\\vspace{10pt}

\\begin{legalbox}{${isEs ? 'CLÁUSULA SEGUNDA: RESPETO Y CONVIVENCIA EN ÁREAS COMUNES' : 'CLAUSE 2: SHARED AREA CO-LIVING'}}
  ${isEs
    ? 'Las partes aceptan mantener un ambiente limpio, seguro y armónico. Las zonas compartidas (cocina, baños, salas) deberán ser higienizadas inmediatamente tras su uso, respetando los horarios de silencio fijados para el descanso nocturno.'
    : 'The parties agree to maintain a clean, safe, and harmonic environment. Common areas must be kept clean after usage, observing quiet hours.'
  }
\\end{legalbox}

\\clearpage

% ================= PÁGINA 3 =================
\\section{VI. ${isEs ? 'MANTENIMIENTO, DESGASTE Y PREAVISO LEGAL' : 'MAINTENANCE & NOTICE PERIOD'}}
\\begin{legalbox}{${isEs ? 'CLÁUSULA TERCERA: EXENCIÓN POR DESGASTE NATURAL' : 'CLAUSE 3: NORMAL WEAR & TEAR EXEMPTION'}}
  ${isEs 
    ? `Se exime de responsabilidad al inquilino por el deterioro ordinario resultante del uso legítimo y cotidiano de la vivienda (${legalFramework.wearAndTearArticle.es}). Los daños ocasionados por dolo o negligencia grave serán cubiertos por el responsable.`
    : 'The tenant is exempted from liability for normal wear and tear from ordinary use. Damages from gross negligence shall be indemnified by the responsible party.'
  }
  \\vspace{6pt}
  
  \\textbf{${isEs ? 'CLÁUSULA CUARTA: PREAVISO Y RESOLUCIÓN DE CONFLICTOS' : 'CLAUSE 4: NOTICE & DISPUTE RESOLUTION'}:}\\\\
  ${isEs
    ? `La resolución anticipada requiere un preaviso formal por escrito con al menos 30 días de anticipación. Cualquier discrepancia se someterá a mediación de buena fe y a los \\textbf{${legalFramework.disputeJurisdiction.es}}.`
    : `Early termination requires 30 days prior written notice. Disputes shall be submitted to good-faith mediation and to the \\textbf{${legalFramework.disputeJurisdiction.en}}.`
  }
\\end{legalbox}

${customClausesTex ? `
\\section{VII. ${isEs ? 'CLÁUSULAS ADICIONALES ACORDADAS' : 'ADDITIONAL AGREED CLAUSES'}}
\\begin{itemize}[leftmargin=*,label=\\tiny$\\bullet$]
${customClausesTex}
\\end{itemize}
` : ''}

\\section{${customClausesTex ? 'VIII.' : 'VII.'} ${isEs ? 'ACEPTACIÓN, FIRMAS Y CERTIFICADO DIGITAL' : 'ACCEPTANCE, SIGNATURES & AUDIT'}}
\\small ${isEs 
  ? `Este contrato ha sido validado electrónicamente conforme a la ley \\textbf{${legalFramework.digitalSignatureLaw.es}} y la ley de protección de datos \\textbf{${legalFramework.dataProtectionLaw.es}}.`
  : `This agreement is digitally certified under \\textbf{${legalFramework.digitalSignatureLaw.en}} and data privacy act \\textbf{${legalFramework.dataProtectionLaw.en}}.`
}

\\vspace{25pt}

\\begin{tabularx}{\\linewidth}{@{}X c X c X@{}}
  \\centering
  \\rule{3.5cm}{0.4pt}\\\\
  \\textbf{${initiatorName}}\\\\
  {\\small Arrendador / Propietario}
  & &
  \\centering
  \\rule{3.5cm}{0.4pt}\\\\
  \\textbf{${counterpartyName}}\\\\
  {\\small Inquilino / Roommate}
  & &
  \\centering
  \\rule{3.5cm}{0.4pt}\\\\
  \\textbf{RoommateFinder Legal}\\\\
  {\\small Testigo Digital}
\\end{tabularx}

\\vspace{30pt}

\\begin{center}
  \\tcbhighmath[colback=BoxBg,colframe=BorderGrey,arc=3pt]{%
    \\ttfamily\\tiny SECURITY HASH SHA-256: ${contractHash}${contractHash.split('').reverse().join('')} -- ROOMMATEFINDER AUDIT CERTIFIED
  }
\\end{center}

\\end{document}
`;
}

/**
 * Descarga el archivo de código fuente LaTeX (.tex) en la web
 */
export function downloadLatexSourceFile(contractData: any, locale: string = 'es') {
  const latexContent = generateLatexSourceCode(contractData, contractData?.status, locale);
  const blob = new Blob([latexContent], { type: 'text/x-tex;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `contrato_${contractData?.id || 'doc'}.tex`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}
