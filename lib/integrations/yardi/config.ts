import { YardiConfigurationError } from './errors';

export interface YardiConfig {
  companyConfigId?: string;       // Presente si se carga de la BD (multitenant)
  apiEndpoint: string;            // URL del servidor API de Yardi
  authUsername: string;           // Usuario del servicio web
  authPassword?: string;          // Contraseña del servicio web
  yardiServerId: string;          // Server ID asignado por Yardi SaaS
  yardiDatabase: string;          // Nombre de la base de datos de Yardi
  yardiLicenseKey: string;        // Clave de licencia de interfaz
  yardiInterfaceEntity?: string;  // Entidad asociada (ej. "RentCafe_API")
  environment: 'test' | 'staging' | 'production';
  simulationMode: boolean;        // Si es true, simula llamadas sin usar credenciales reales
}

/**
 * Valida un objeto de configuración de Yardi.
 * Lanza YardiConfigurationError si faltan campos obligatorios.
 */
export function validateConfig(config: YardiConfig): void {
  const missingKeys: string[] = [];

  if (!config.apiEndpoint) missingKeys.push('apiEndpoint');
  if (!config.yardiServerId) missingKeys.push('yardiServerId');
  if (!config.yardiDatabase) missingKeys.push('yardiDatabase');
  
  // Si no está en modo simulación, requerimos credenciales de API completas
  if (!config.simulationMode) {
    if (!config.authUsername) missingKeys.push('authUsername');
    if (!config.authPassword) missingKeys.push('authPassword');
    if (!config.yardiLicenseKey) missingKeys.push('yardiLicenseKey');
  }

  if (missingKeys.length > 0) {
    throw new YardiConfigurationError(
      'Faltan campos obligatorios en la configuración de la integración.',
      missingKeys
    );
  }
}

/**
 * Carga la configuración de Yardi desde las variables de entorno.
 * Útil para pruebas locales o despliegues single-tenant.
 */
export function loadConfigFromEnv(): YardiConfig {
  const isDev = process.env.NODE_ENV === 'development';
  
  const config: YardiConfig = {
    apiEndpoint: process.env.EXPO_PUBLIC_YARDI_API_ENDPOINT || 'https://sandbox.yardihosting.com/v1/api',
    authUsername: process.env.EXPO_PUBLIC_YARDI_AUTH_USERNAME || 'mock_user',
    authPassword: process.env.EXPO_PUBLIC_YARDI_AUTH_PASSWORD || 'mock_password',
    yardiServerId: process.env.EXPO_PUBLIC_YARDI_SERVER_ID || 'mock_server_01',
    yardiDatabase: process.env.EXPO_PUBLIC_YARDI_DATABASE || 'mock_db',
    yardiLicenseKey: process.env.EXPO_PUBLIC_YARDI_LICENSE_KEY || 'mock_license_key_xyz',
    yardiInterfaceEntity: process.env.EXPO_PUBLIC_YARDI_INTERFACE_ENTITY || 'RentCafe_API',
    environment: (process.env.EXPO_PUBLIC_YARDI_ENVIRONMENT as any) || (isDev ? 'staging' : 'production'),
    simulationMode: process.env.EXPO_PUBLIC_YARDI_SIMULATION_MODE !== 'false', // Por defecto true a menos que se defina explícitamente como 'false'
  };

  return config;
}

/**
 * Carga la configuración de Yardi desde la base de datos de Supabase.
 * Habilita el soporte multitenant (cada compañía tiene su propia configuración).
 */
export async function loadConfigFromDb(companyConfigId: string): Promise<YardiConfig> {
  try {
    const { supabase } = require('../../supabase');
    const { data, error } = await (supabase as any)
      .from('pms_company_configs')
      .select('*')
      .eq('id', companyConfigId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new YardiConfigurationError(`Fallo al consultar la base de datos: ${error.message}`);
    }

    if (!data) {
      throw new YardiConfigurationError(
        `No se encontró configuración activa de PMS para la ID: ${companyConfigId}`
      );
    }

    const config: YardiConfig = {
      companyConfigId: data.id,
      apiEndpoint: data.api_endpoint,
      authUsername: data.auth_username || '',
      authPassword: data.auth_password_hash || '', // En producción real, la descifraríamos aquí
      yardiServerId: data.yardi_server_id || '',
      yardiDatabase: data.yardi_database || '',
      yardiLicenseKey: data.yardi_license_key || '',
      yardiInterfaceEntity: data.yardi_interface_entity || undefined,
      environment: data.environment as any,
      simulationMode: false, // Las configuraciones cargadas de BD asumen producción/conexión real
    };

    return config;
  } catch (error: any) {
    if (error instanceof YardiConfigurationError) {
      throw error;
    }
    throw new YardiConfigurationError(`Error inesperado al cargar configuración: ${error.message}`);
  }
}
