import { loadConfigFromEnv, validateConfig } from '../lib/integrations/yardi/config';
import { YardiApiClient } from '../lib/integrations/yardi/client';
import { YardiSyncManager } from '../lib/integrations/yardi/sync';
import { YardiIntegrationProvider } from '../lib/integrations/yardi/provider';
import { PmsProperty, PmsUnit, PmsResident, PmsLease, PmsWorkOrder } from '../lib/integrations/pms-interface';

async function runTests() {
  console.log('====================================================');
  console.log('INICIANDO PRUEBAS DE INTEGRACIÓN DE YARDI VOYAGER');
  console.log('====================================================');

  try {
    // 1. Cargar y validar configuración simulada
    console.log('\n[Paso 1] Cargando configuración...');
    const config = loadConfigFromEnv();
    config.simulationMode = true; // Forzar modo simulación
    validateConfig(config);
    console.log('✔ Configuración cargada y validada correctamente.');
    console.log(`- Endpoint: ${config.apiEndpoint}`);
    console.log(`- Servidor Yardi: ${config.yardiServerId}`);
    console.log(`- Base de datos Yardi: ${config.yardiDatabase}`);
    console.log(`- Entorno: ${config.environment}`);
    console.log(`- Modo Simulación: ${config.simulationMode ? 'ACTIVO' : 'INACTIVO'}`);

    // 2. Inicializar Cliente API, SyncManager y Provider
    console.log('\n[Paso 2] Inicializando componentes del módulo...');
    const client = new YardiApiClient(config);
    const syncManager = new YardiSyncManager(client); // Prueba sin ID de compañía (modo en memoria)
    const provider = new YardiIntegrationProvider(client, syncManager);
    console.log('✔ Componentes inicializados correctamente.');

    // 3. Probar ciclo de vida de Propiedades (Sync & Get)
    console.log('\n[Paso 3] Probando sincronización de Propiedad...');
    const mockPropertyInput: Omit<PmsProperty, 'externalId'> = {
      id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      name: 'Edificio Vancouver Central',
      address: '1055 W Georgia St, Vancouver, BC, V6E 3P3, Canada',
      city: 'Vancouver',
      stateProvince: 'BC',
      postalCode: 'V6E 3P3',
      country: 'Canada',
      status: 'active',
    };

    const syncedProperty = await provider.syncProperty(mockPropertyInput);
    console.log('✔ Propiedad sincronizada exitosamente.');
    console.log(`- ID Local: ${syncedProperty.id}`);
    console.log(`- Código Externo Yardi: ${syncedProperty.externalId}`);
    console.log(`- Dirección Unificada: ${syncedProperty.address}`);

    // Verificar mapeo guardado
    const savedPropCode = await syncManager.getExternalCode(mockPropertyInput.id, 'property');
    console.log(`- Mapeo guardado en gestor de sincronización: ${savedPropCode}`);

    // 4. Probar ciclo de vida de Unidades
    console.log('\n[Paso 4] Probando sincronización de Unidad...');
    const mockUnitInput: Omit<PmsUnit, 'externalId'> = {
      id: 'f9e8d7c6-b5a4-3f2e-1d0c-9b8a7f6e5d4c',
      propertyExternalId: syncedProperty.externalId,
      unitNumber: '502-A',
      bedRooms: 2,
      bathRooms: 1.5,
      rentAmount: 2450.00,
      status: 'vacant',
    };

    const syncedUnit = await provider.syncUnit(mockUnitInput);
    console.log('✔ Unidad sincronizada exitosamente.');
    console.log(`- ID Local: ${syncedUnit.id}`);
    console.log(`- Código Externo Yardi: ${syncedUnit.externalId}`);
    console.log(`- Monto Renta: $${syncedUnit.rentAmount}`);

    // 5. Probar Residentes e Inquilinos
    console.log('\n[Paso 5] Probando sincronización de Residente...');
    const mockResidentInput: Omit<PmsResident, 'externalId'> = {
      id: 'u1v2w3x4-y5z6-7a8b-9c0d-1e2f3a4b5c6d',
      firstName: 'Mateo',
      lastName: 'Fernandez',
      email: 'mateo.fernandez@example.com',
      phone: '604-555-9876',
      status: 'current',
    };

    const syncedResident = await provider.syncResident(mockResidentInput);
    console.log('✔ Residente sincronizado exitosamente.');
    console.log(`- ID Local: ${syncedResident.id}`);
    console.log(`- Código Externo Yardi: ${syncedResident.externalId}`);
    console.log(`- Nombre Completo: ${syncedResident.firstName} ${syncedResident.lastName}`);

    // 6. Probar Arrendamientos (Leases)
    console.log('\n[Paso 6] Probando sincronización de Contrato/Arrendamiento...');
    const mockLeaseInput: Omit<PmsLease, 'externalId'> = {
      id: 'c9b8a7f6-e5d4-3c2b-1a0f-9e8d7c6b5a4f',
      unitExternalId: syncedUnit.externalId,
      residentExternalId: syncedResident.externalId,
      startDate: '2026-08-01',
      endDate: '2027-07-31',
      monthlyRent: 2450.00,
      securityDeposit: 1225.00,
      status: 'active',
    };

    const syncedLease = await provider.syncLease(mockLeaseInput);
    console.log('✔ Contrato sincronizado exitosamente.');
    console.log(`- ID Local: ${syncedLease.id}`);
    console.log(`- Código Externo Yardi: ${syncedLease.externalId}`);
    console.log(`- Depósito de Seguridad: $${syncedLease.securityDeposit}`);

    // 7. Probar Órdenes de Trabajo (Mantenimiento)
    console.log('\n[Paso 7] Probando sincronización de Orden de Trabajo...');
    const mockWOInput: Omit<PmsWorkOrder, 'externalId'> = {
      id: 'w1o2r3k4-o5r6-7d8e-9r0d-1e2f3a4b5c6d',
      propertyExternalId: syncedProperty.externalId,
      unitExternalId: syncedUnit.externalId,
      tenantExternalId: syncedResident.externalId,
      category: 'Plomería',
      description: 'Goteo severo debajo del fregadero de la cocina principal.',
      priority: 'high',
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    const syncedWO = await provider.syncWorkOrder(mockWOInput);
    console.log('✔ Orden de Trabajo sincronizada exitosamente.');
    console.log(`- ID Local: ${syncedWO.id}`);
    console.log(`- Código Externo Yardi: ${syncedWO.externalId}`);
    console.log(`- Prioridad: ${syncedWO.priority}`);
    console.log(`- Estado: ${syncedWO.status}`);

    // 8. Probar Datos Financieros
    console.log('\n[Paso 8] Probando consulta de saldo financiero...');
    const financialSummary = await provider.getFinancialSummary(syncedLease.externalId);
    console.log('✔ Resumen financiero obtenido exitosamente.');
    console.log(`- Saldo Pendiente Yardi: $${financialSummary.outstandingBalance}`);
    console.log(`- Número de transacciones recientes: ${financialSummary.recentTransactions.length}`);
    financialSummary.recentTransactions.forEach((tx: any) => {
      console.log(`  * [${tx.date}] ${tx.description}: $${tx.amount} (${tx.type})`);
    });

    // 9. Probar Webhooks (Simulado)
    console.log('\n[Paso 9] Probando simulación de Webhook entrante desde Yardi...');
    const webhookResult = await syncManager.handleYardiWebhook({
      eventType: 'WORK_ORDER_COMPLETED',
      externalCode: syncedWO.externalId,
      payload: {
        WorkOrderNumber: syncedWO.externalId,
        Status: 'Completed',
        DateCompleted: new Date().toISOString(),
        TechnicianNotes: 'Fregadero reparado reemplazando el empaque de goma.',
      },
    });
    console.log(`✔ Webhook procesado. Resultado: ${webhookResult.success} - Mensaje: ${webhookResult.message}`);

    console.log('\n====================================================');
    console.log('¡TODAS LAS PRUEBAS DE LA ARQUITECTURA COMPLETADAS CON ÉXITO!');
    console.log('====================================================');
  } catch (error: any) {
    console.error('\n❌ ERROR DURANTE LA EJECUCIÓN DE LAS PRUEBAS:', error);
    process.exit(1);
  }
}

runTests();
