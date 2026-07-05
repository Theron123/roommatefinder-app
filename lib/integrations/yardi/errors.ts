/**
 * Jerarquía de clases de error específicas para la integración con Yardi Voyager.
 * Facilita el diagnóstico, reporte y recuperación de fallos en producción.
 */

export class YardiIntegrationError extends Error {
  public readonly timestamp: Date;

  constructor(message: string, public readonly code: string = 'YARDI_INTEGRATION_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error al configurar las credenciales o parámetros de Yardi (por ejemplo, variables ausentes).
 */
export class YardiConfigurationError extends YardiIntegrationError {
  constructor(message: string, public readonly missingKeys: string[] = []) {
    super(
      `Error de configuración en Yardi Voyager: ${message}${
        missingKeys.length ? ` (Faltan: ${missingKeys.join(', ')})` : ''
      }`,
      'YARDI_CONFIG_ERROR'
    );
  }
}

/**
 * Error en el transporte de la API (fallo HTTP, tiempo de espera agotado, error de SOAP, credenciales inválidas).
 */
export class YardiApiError extends YardiIntegrationError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responsePayload?: any,
    public readonly requestUrl?: string
  ) {
    super(
      `Error de comunicación API con Yardi: ${message}${
        statusCode ? ` (HTTP ${statusCode})` : ''
      }`,
      'YARDI_API_ERROR'
    );
  }
}

/**
 * Error cuando los datos locales no cumplen con las validaciones requeridas por Yardi antes del envío.
 */
export class YardiValidationError extends YardiIntegrationError {
  constructor(message: string, public readonly validationErrors: Record<string, string> = {}) {
    super(
      `Datos locales no válidos para Yardi: ${message}`,
      'YARDI_VALIDATION_ERROR'
    );
  }
}

/**
 * Error al mapear datos locales de Supabase a modelos externos de Yardi o viceversa.
 */
export class YardiMappingError extends YardiIntegrationError {
  constructor(message: string, public readonly internalId?: string, public readonly externalCode?: string) {
    super(
      `Fallo de mapeo de datos entre Supabase y Yardi: ${message}${
        internalId ? ` (ID Interno: ${internalId})` : ''
      }${externalCode ? ` (Código Externo: ${externalCode})` : ''}`,
      'YARDI_MAPPING_ERROR'
    );
  }
}

/**
 * Conflicto de sincronización (por ejemplo, el registro en Yardi ha cambiado de forma incompatible o es más reciente).
 */
export class YardiSyncConflictError extends YardiIntegrationError {
  constructor(
    message: string,
    public readonly internalId: string,
    public readonly externalCode: string,
    public readonly localData?: any,
    public readonly externalData?: any
  ) {
    super(
      `Conflicto de sincronización con Yardi: ${message} (Local: ${internalId}, Externo: ${externalCode})`,
      'YARDI_SYNC_CONFLICT'
    );
  }
}
