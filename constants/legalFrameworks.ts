export type CountryCode = 'CR' | 'MX' | 'CO' | 'ES' | 'US' | 'INT';

export interface LegalFramework {
  countryCode: CountryCode;
  countryName: { es: string; en: string };
  cityDefault: { es: string; en: string };
  tenancyLaw: { es: string; en: string };
  digitalSignatureLaw: { es: string; en: string };
  dataProtectionLaw: { es: string; en: string };
  disputeJurisdiction: { es: string; en: string };
  wearAndTearArticle: { es: string; en: string };
}

export const LEGAL_FRAMEWORKS: Record<CountryCode, LegalFramework> = {
  CR: {
    countryCode: 'CR',
    countryName: { es: 'Costa Rica', en: 'Costa Rica' },
    cityDefault: { es: 'San José, Costa Rica', en: 'San Jose, Costa Rica' },
    tenancyLaw: {
      es: 'Ley N° 7527 (Ley de Arrendamientos Urbanos y Suburbanos de Costa Rica)',
      en: 'Law No. 7527 (Urban and Suburban Tenancy Act of Costa Rica)',
    },
    digitalSignatureLaw: {
      es: 'Ley N° 8454 (Certificados, Firmas Digitales y Documentos Electrónicos)',
      en: 'Law No. 8454 (Digital Signatures and Electronic Documents)',
    },
    dataProtectionLaw: {
      es: 'Ley N° 8968 (Protección de la Persona frente al Tratamiento de sus Datos Personales)',
      en: 'Law No. 8968 (Personal Data Protection Act)',
    },
    disputeJurisdiction: {
      es: 'Tribunales Civiles de la República de Costa Rica',
      en: 'Civil Courts of the Republic of Costa Rica',
    },
    wearAndTearArticle: {
      es: 'conforme al Art. 40 de la Ley N° 7527 (exención por desgaste natural por uso legítimo)',
      en: 'pursuant to Art. 40 of Law No. 7527 (exemption for normal wear and tear)',
    },
  },
  MX: {
    countryCode: 'MX',
    countryName: { es: 'México', en: 'Mexico' },
    cityDefault: { es: 'Ciudad de México, México', en: 'Mexico City, Mexico' },
    tenancyLaw: {
      es: 'Código Civil Federal y Códigos Civiles Estatales (Capítulo de Arrendamiento Habitacional)',
      en: 'Federal Civil Code & State Civil Codes (Residential Lease Chapter)',
    },
    digitalSignatureLaw: {
      es: 'Ley de Firma Electrónica Avanzada y Código de Comercio (Título II de Contratación Electrónica)',
      en: 'Advanced Electronic Signature Law & Commercial Code (Electronic Contracting)',
    },
    dataProtectionLaw: {
      es: 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)',
      en: 'Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP)',
    },
    disputeJurisdiction: {
      es: 'Tribunales del Fuero Común en la jurisdicción del inmueble',
      en: 'Civil Courts of the property jurisdiction',
    },
    wearAndTearArticle: {
      es: 'conforme a la legislación civil aplicable (exención de deterioro por uso cotidiano razonable)',
      en: 'pursuant to applicable civil law (exemption for reasonable daily wear and tear)',
    },
  },
  CO: {
    countryCode: 'CO',
    countryName: { es: 'Colombia', en: 'Colombia' },
    cityDefault: { es: 'Bogotá, Colombia', en: 'Bogota, Colombia' },
    tenancyLaw: {
      es: 'Ley 820 de 2003 (Régimen de Arrendamiento de Vivienda Urbana de Colombia)',
      en: 'Law 820 of 2003 (Urban Housing Tenancy Regime of Colombia)',
    },
    digitalSignatureLaw: {
      es: 'Ley 527 de 1999 (Acceso y Uso de Mensajes de Datos, Comercio Electrónico y Firmas Digitales)',
      en: 'Law 527 of 1999 (Data Messages, Electronic Commerce & Digital Signatures)',
    },
    dataProtectionLaw: {
      es: 'Ley Estatutaria 1581 de 2012 (Protección de Datos Personales / Habeas Data)',
      en: 'Statutory Law 1581 of 2012 (Personal Data Protection / Habeas Data)',
    },
    disputeJurisdiction: {
      es: 'Juzgados Civiles del Circuito de la República de Colombia',
      en: 'Civil Circuit Courts of the Republic of Colombia',
    },
    wearAndTearArticle: {
      es: 'conforme al Art. 1997 del Código Civil (exención por el deterioro del goce legítimo)',
      en: 'pursuant to Art. 1997 of the Civil Code (exemption for legitimate enjoyment wear)',
    },
  },
  ES: {
    countryCode: 'ES',
    countryName: { es: 'España', en: 'Spain' },
    cityDefault: { es: 'Madrid, España', en: 'Madrid, Spain' },
    tenancyLaw: {
      es: 'Ley 29/1994, de 24 de noviembre, de Arrendamientos Urbanos (LAU)',
      en: 'Urban Tenancy Law 29/1994 (LAU of Spain)',
    },
    digitalSignatureLaw: {
      es: 'Reglamento (UE) N° 910/2014 (eIDAS) y Ley 6/2020 reguladora de servicios electrónicos de confianza',
      en: 'EU Regulation No. 910/2014 (eIDAS) & Electronic Trust Services Law 6/2020',
    },
    dataProtectionLaw: {
      es: 'Ley Orgánica 3/2018 (LOPDGDD) y Reglamento General de Protección de Datos (RGPD UE 2016/679)',
      en: 'Organic Law 3/2018 (LOPDGDD) & EU General Data Protection Regulation (GDPR)',
    },
    disputeJurisdiction: {
      es: 'Juzgados de Primera Instancia del lugar donde radica la finca',
      en: 'Courts of First Instance of the property location',
    },
    wearAndTearArticle: {
      es: 'conforme al Art. 1561 del Código Civil (exención por el menoscabo del uso ordinario)',
      en: 'pursuant to Art. 1561 of the Civil Code (exemption for ordinary use wear)',
    },
  },
  US: {
    countryCode: 'US',
    countryName: { es: 'Estados Unidos', en: 'United States' },
    cityDefault: { es: 'Miami, FL, EE. UU.', en: 'Miami, FL, USA' },
    tenancyLaw: {
      es: 'Leyes Estatales de Arrendamiento Habitacional y Uniform Residential Landlord and Tenant Act (URLTA)',
      en: 'State Residential Landlord Tenant Acts & Uniform Residential Landlord and Tenant Act (URLTA)',
    },
    digitalSignatureLaw: {
      es: 'Electronic Signatures in Global and National Commerce Act (ESIGN Act) y Uniform Electronic Transactions Act (UETA)',
      en: 'Electronic Signatures in Global and National Commerce Act (ESIGN Act) & UETA',
    },
    dataProtectionLaw: {
      es: 'Leyes Estatales de Privacidad de Datos y Términos de Privacidad de la Plataforma',
      en: 'State Data Privacy Laws & Platform Privacy Policy',
    },
    disputeJurisdiction: {
      es: 'Tribunales Estatales/Locales del Condado donde se ubica el inmueble',
      en: 'State/Local County Courts of the property location',
    },
    wearAndTearArticle: {
      es: 'conforme a la exención por desgaste y uso ordinario habitual (normal wear and tear)',
      en: 'pursuant to standard normal wear and tear exemptions',
    },
  },
  INT: {
    countryCode: 'INT',
    countryName: { es: 'Internacional / General', en: 'International / General' },
    cityDefault: { es: 'Sede Internacional', en: 'International Headquarters' },
    tenancyLaw: {
      es: 'Marco General de Contratación Privada de Arrendamiento y Co-living Habitacional',
      en: 'General Private Co-living & Residential Lease Contracting Framework',
    },
    digitalSignatureLaw: {
      es: 'Estándares Criptográficos de Firma Electrónica e Identificación Digital de la Plataforma',
      en: 'Platform Digital Signature & Cryptographic Electronic Identification Standards',
    },
    dataProtectionLaw: {
      es: 'Política Global de Privacidad y Tratamiento Confidencial de Datos de RoommateFinder',
      en: 'RoommateFinder Global Privacy Policy & Confidential Data Processing',
    },
    disputeJurisdiction: {
      es: 'Mediación de buena fe y Tribunales Competentes del lugar del inmueble',
      en: 'Good-faith Mediation & Competent Courts of the property location',
    },
    wearAndTearArticle: {
      es: 'conforme a la exención general por uso normal, diligente y cotidiano',
      en: 'pursuant to general exemptions for diligent and normal daily use',
    },
  },
};

/**
 * Detects the country code from an address or defaults to INT / CR
 */
export function detectCountryCode(addressOrLocation?: string | null): CountryCode {
  if (!addressOrLocation) return 'CR'; // Default to CR as requested by user context or INT
  const text = addressOrLocation.toLowerCase();

  if (text.includes('costa rica') || text.includes('san josé') || text.includes('san jose') || text.includes('heredia') || text.includes('alajuela') || text.includes('cartago')) {
    return 'CR';
  }
  if (text.includes('méxico') || text.includes('mexico') || text.includes('cdmx') || text.includes('guadalajara') || text.includes('monterrey')) {
    return 'MX';
  }
  if (text.includes('colombia') || text.includes('bogotá') || text.includes('bogota') || text.includes('medellín') || text.includes('cali')) {
    return 'CO';
  }
  if (text.includes('españa') || text.includes('spain') || text.includes('madrid') || text.includes('barcelona') || text.includes('valencia')) {
    return 'ES';
  }
  if (text.includes('usa') || text.includes('united states') || text.includes('eeuu') || text.includes('ee.uu') || text.includes('miami') || text.includes('york')) {
    return 'US';
  }
  return 'CR';
}

export function getLegalFramework(countryCode?: string | null, fallbackAddress?: string | null): LegalFramework {
  let code: CountryCode = 'CR';

  if (countryCode && countryCode.toUpperCase() in LEGAL_FRAMEWORKS) {
    code = countryCode.toUpperCase() as CountryCode;
  } else {
    code = detectCountryCode(fallbackAddress);
  }

  return LEGAL_FRAMEWORKS[code] || LEGAL_FRAMEWORKS.CR;
}
