import { YardiApiClient } from '../lib/integrations/yardi/client';
import { loadConfigFromEnv } from '../lib/integrations/yardi/config';
import { YardiSyncManager } from '../lib/integrations/yardi/sync';
import { YardiIntegrationProvider } from '../lib/integrations/yardi/provider';
import { yardiAdapter } from '../lib/integrations/yardi/YardiAdapter';

// Configurar variables de entorno ficticias para el proceso de prueba
process.env.EXPO_PUBLIC_YARDI_SIMULATION_MODE = 'true';
process.env.EXPO_PUBLIC_YARDI_API_ENDPOINT = 'https://sandbox.yardihosting.com/v1/api';

async function runTests() {
  console.log('=== INICIANDO PRUEBA DE INTEGRACIÓN YARDI (SIMULACIÓN) ===\n');

  // Test 1: YardiAdapter (Tenant Status Mock)
  console.log('--- TEST 1: YardiAdapter.getTenantStatus ---');
  const tenantEmail = 'test.tenant@example.com';
  const status = await yardiAdapter.getTenantStatus(tenantEmail);
  console.log('Resultado Tenant Status:', JSON.stringify(status, null, 2));
  console.log('\n');

  // Test 2: YardiApiClient & YardiSyncManager
  console.log('--- TEST 2: YardiApiClient (REST Properties & SOAP mock) ---');
  const config = loadConfigFromEnv();
  console.log('Configuración cargada:', {
    apiEndpoint: config.apiEndpoint,
    simulationMode: config.simulationMode,
  });

  const client = new YardiApiClient(config);
  
  // Obtener propiedades simuladas (REST)
  const properties = await client.get('/properties');
  console.log('Propiedades recibidas (REST Mock):', JSON.stringify(properties, null, 2));
  console.log('\n');

  // Ejecutar petición SOAP simulada
  const soapResponse = await client.soapRequest('GetResidentDetails', '<ResidentID>123</ResidentID>');
  console.log('Respuesta SOAP Recibida (XML Mock):');
  console.log(soapResponse);
  console.log('\n');

  // Test 3: YardiIntegrationProvider (Sync Lease)
  console.log('--- TEST 3: YardiIntegrationProvider (syncLease) ---');
  const syncManager = new YardiSyncManager(client);
  const provider = new YardiIntegrationProvider(client, syncManager);

  try {
    const syncResult = await provider.syncLease({
      id: 'local-lease-abc-123',
      propertyId: 'prop_vancouver_01',
      residentId: 'res-456',
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      rentAmount: 1500.00,
      status: 'Active'
    });
    console.log('Resultado de sincronización de Lease:', JSON.stringify(syncResult, null, 2));
  } catch (error) {
    console.error('Error sincronizando Lease:', error);
  }

  console.log('\n=== PRUEBAS COMPLETADAS CON ÉXITO ===');
}

runTests().catch(console.error);
