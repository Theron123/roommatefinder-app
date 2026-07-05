import { YardiConfig } from './config';
import { YardiApiError } from './errors';

export class YardiApiClient {
  private config: YardiConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: YardiConfig) {
    this.config = config;
  }

  /**
   * Realiza una petición REST GET a la API de Yardi.
   */
  public async get<T = any>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.requestWithRetry<T>(url, { method: 'GET' });
  }

  /**
   * Realiza una petición REST POST a la API de Yardi.
   */
  public async post<T = any>(path: string, body: any): Promise<T> {
    const url = this.buildUrl(path);
    return this.requestWithRetry<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Realiza una petición SOAP (XML) habitual de los Web Services de Yardi.
   */
  public async soapRequest(action: string, xmlPayload: string): Promise<string> {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <YardiAuthHeader xmlns="http://tempuri.org/YardiWebServices">
      <Username>${this.config.authUsername}</Username>
      <Password>${this.config.authPassword || ''}</Password>
      <ServerId>${this.config.yardiServerId}</ServerId>
      <Database>${this.config.yardiDatabase}</Database>
      <LicenseKey>${this.config.yardiLicenseKey}</LicenseKey>
      <InterfaceEntity>${this.config.yardiInterfaceEntity || ''}</InterfaceEntity>
    </YardiAuthHeader>
  </soap:Header>
  <soap:Body>
    ${xmlPayload}
  </soap:Body>
</soap:Envelope>`;

    if (this.config.simulationMode) {
      console.log(`[YARDI SOAP SIMULATOR] Acción: ${action}`);
      return this.simulateSoapResponse(action);
    }

    const headers = {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': action,
    };

    try {
      const response = await this.executeFetch(this.config.apiEndpoint, {
        method: 'POST',
        headers,
        body: soapEnvelope,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new YardiApiError(
          `Error de transporte SOAP (${response.statusText})`,
          response.status,
          text,
          this.config.apiEndpoint
        );
      }

      return await response.text();
    } catch (error: any) {
      if (error instanceof YardiApiError) throw error;
      throw new YardiApiError(error.message || 'Error de red SOAP');
    }
  }

  /**
   * Obtiene un token de acceso OAuth2 (si la API de Yardi lo requiere).
   */
  private async getAccessToken(): Promise<string> {
    if (this.config.simulationMode) {
      return 'simulated_oauth2_token_12345';
    }

    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    try {
      const authUrl = `${this.config.apiEndpoint}/oauth/token`;
      const response = await this.executeFetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.authUsername,
          client_secret: this.config.authPassword || '',
        }).toString(),
      });

      if (!response.ok) {
        throw new YardiApiError(
          'Fallo al autenticar credenciales de Yardi OAuth2',
          response.status,
          await response.json(),
          authUrl
        );
      }

      const data = await response.json();
      this.token = data.access_token;
      // Vence en expira_in segundos, le restamos un margen de 60 segundos
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
      return this.token!;
    } catch (error: any) {
      if (error instanceof YardiApiError) throw error;
      throw new YardiApiError(`Error de autenticación: ${error.message}`);
    }
  }

  /**
   * Ejecuta peticiones REST con reintentos automáticos ante errores transitorios.
   */
  private async requestWithRetry<T>(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<T> {
    if (this.config.simulationMode) {
      return this.simulateRestResponse<T>(url, options);
    }

    const token = await this.getAccessToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.executeFetch(url, { ...options, headers });
        
        if (!response.ok) {
          // Errores HTTP no reintentables
          if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
            const errBody = await this.safeParseJson(response);
            throw new YardiApiError(
              `Error de solicitud HTTP (${response.statusText})`,
              response.status,
              errBody,
              url
            );
          }
          
          throw new Error(`Código HTTP: ${response.status}`);
        }

        return (await response.json()) as T;
      } catch (err: any) {
        lastError = err;
        if (err instanceof YardiApiError) throw err; // Lanza inmediatamente si no es reintentable
        
        console.warn(`[YARDI API CLIENT] Intento ${i + 1} falló para url ${url}. Reintentando en ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // Backoff exponencial
      }
    }

    throw new YardiApiError(
      `Fallo después de ${retries} reintentos: ${lastError.message}`,
      undefined,
      undefined,
      url
    );
  }

  /**
   * Helper para construir URL con query parameters.
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const baseUrl = this.config.apiEndpoint.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${cleanPath}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));
    }
    return url.toString();
  }

  /**
   * Envoltura de fetch nativo para pruebas independientes del entorno (Node / Web / React Native).
   */
  private async executeFetch(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  private async safeParseJson(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      try {
        return await response.text();
      } catch {
        return null;
      }
    }
  }

  /**
   * Registra un log de sincronización en la tabla de Supabase.
   */
  public async logSync(params: {
    direction: 'inbound' | 'outbound';
    entityType: string;
    internalId?: string;
    externalCode?: string;
    operation: string;
    status: 'success' | 'failure';
    payload: any;
    responsePayload?: any;
    errorMessage?: string;
  }): Promise<void> {
    if (!this.config.companyConfigId) {
      // Si no hay configuración de base de datos activa (ej. testing por variables de entorno), solo logea en consola
      console.log(`[YARDI SYNC LOG] ${params.direction.toUpperCase()} | ${params.entityType} | ${params.operation} | ${params.status.toUpperCase()}`, {
        internalId: params.internalId,
        externalCode: params.externalCode,
        error: params.errorMessage,
      });
      return;
    }

    try {
      const { supabase } = require('../../supabase');
      await (supabase as any).from('pms_sync_logs').insert({
        company_config_id: this.config.companyConfigId,
        direction: params.direction,
        entity_type: params.entityType,
        internal_id: params.internalId || null,
        external_code: params.externalCode || null,
        operation: params.operation,
        status: params.status,
        payload: params.payload,
        response_payload: params.responsePayload || null,
        error_message: params.errorMessage || null,
      });
    } catch (dbError) {
      console.error('[YARDI API CLIENT] Error al escribir en pms_sync_logs de Supabase:', dbError);
    }
  }

  /** ====================================================================
   * MOCK / RESPUESTAS SIMULADAS DE YARDI
   * Habilita pruebas locales sin necesidad de credenciales reales.
   * ==================================================================== */

  private simulateRestResponse<T>(url: string, options: RequestInit): T {
    console.log(`[YARDI API REST SIMULATOR] ${options.method} | URL: ${url}`);
    
    // Simula respuestas basadas en los endpoints esperados
    if (url.includes('/properties')) {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return {
          PropertyCode: body.PropertyCode || 'mock_prop_vancouver',
          PropertyName: body.PropertyName || 'Vancouver Apartment Block A',
          AddressInfo: body.AddressInfo || { Address1: '123 Main St', City: 'Vancouver', State: 'BC', PostalCode: 'V6B 2T4', Country: 'CA' },
          Status: 'Active',
        } as any;
      }
      // GET listings/properties
      return [
        {
          PropertyCode: 'prop_vancouver_01',
          PropertyName: 'Gastown Cozy Lofts',
          AddressInfo: { Address1: '456 Water St', City: 'Vancouver', State: 'BC', PostalCode: 'V6B 1B6', Country: 'CA' },
          Status: 'Active',
        },
        {
          PropertyCode: 'prop_toronto_01',
          PropertyName: 'Queen St Highrise',
          AddressInfo: { Address1: '789 Queen St W', City: 'Toronto', State: 'ON', PostalCode: 'M6J 1G1', Country: 'CA' },
          Status: 'Active',
        }
      ] as any;
    }

    if (url.includes('/residents')) {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return {
          TenantCode: `t00${Math.floor(1000 + Math.random() * 9000)}`,
          PropertyCode: body.PropertyCode || 'prop_vancouver_01',
          UnitCode: body.UnitCode || 'u101',
          FirstName: body.FirstName || 'John',
          LastName: body.LastName || 'Doe',
          Email: body.Email || 'john.doe@example.com',
          Phone: body.Phone || '604-555-0192',
          Status: 'Current',
          LeaseStartDate: body.LeaseStartDate || '2026-07-01',
          LeaseEndDate: body.LeaseEndDate || '2027-06-30',
        } as any;
      }
      // GET
      return {
        TenantCode: 't001842',
        PropertyCode: 'prop_vancouver_01',
        UnitCode: 'u101',
        FirstName: 'Alex',
        LastName: 'Smith',
        Email: 'alex.smith@example.com',
        Phone: '604-555-1234',
        Status: 'Current',
        LeaseStartDate: '2026-01-01',
        LeaseEndDate: '2026-12-31',
      } as any;
    }

    if (url.includes('/workorders')) {
      return {
        WorkOrderNumber: `wo-${Math.floor(100000 + Math.random() * 900000)}`,
        PropertyCode: 'prop_vancouver_01',
        UnitCode: 'u101',
        TenantCode: 't001842',
        ProblemDescription: 'La tubería del baño gotea constantemente.',
        CategoryCode: 'PLUM',
        CategoryDescription: 'Plumbing',
        Priority: 'High',
        Status: 'New',
        DateCreated: new Date().toISOString(),
      } as any;
    }

    if (url.includes('/financials')) {
      return {
        TenantCode: 't001842',
        LeaseID: 'lease-992',
        CurrentBalance: 1250.00,
        LastPaymentAmount: 1200.00,
        LastPaymentDate: '2026-06-01',
        Transactions: [
          { TransactionID: 'tx-001', PostDate: '2026-06-01', Description: 'Payment Received', Amount: -1200.00, TransactionType: 'Payment' },
          { TransactionID: 'tx-002', PostDate: '2026-06-01', Description: 'Monthly Rent', Amount: 1200.00, TransactionType: 'Charge', ChargeCode: 'rent' },
          { TransactionID: 'tx-003', PostDate: '2026-07-01', Description: 'Monthly Rent', Amount: 1250.00, TransactionType: 'Charge', ChargeCode: 'rent' },
        ]
      } as any;
    }

    if (url.includes('/units')) {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return {
          UnitCode: body.UnitCode || `u-${Math.floor(100 + Math.random() * 900)}`,
          PropertyCode: body.PropertyCode || 'prop_vancouver_01',
          UnitName: body.UnitName || '502-A',
          Status: 'Vacant',
          Bedrooms: body.Bedrooms || 2,
          Bathrooms: body.Bathrooms || 1.5,
          RentRange: { MinRent: body.RentRange?.MinRent || 2450.00, MaxRent: body.RentRange?.MaxRent || 2450.00 },
        } as any;
      }
      return {
        UnitCode: 'u101',
        PropertyCode: 'prop_vancouver_01',
        UnitName: '101',
        Status: 'Occupied',
        Bedrooms: 1,
        Bathrooms: 1,
      } as any;
    }

    if (url.includes('/leases')) {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return {
          LeaseID: `l-${Math.floor(1000 + Math.random() * 9000)}`,
          TenantCode: body.TenantCode || 't001842',
          PropertyCode: body.PropertyCode || 'prop_vancouver_01',
          UnitCode: body.UnitCode || 'u101',
          StartDate: body.StartDate || '2026-08-01',
          EndDate: body.EndDate || '2027-07-31',
          MonthlyRent: body.MonthlyRent || 2450.00,
          SecurityDeposit: body.SecurityDeposit || 1225.00,
          Status: 'Active',
          BillingDayOfMonth: 1,
        } as any;
      }
      return {
        LeaseID: 'lease-992',
        TenantCode: 't001842',
        PropertyCode: 'prop_vancouver_01',
        UnitCode: 'u101',
        StartDate: '2026-01-01',
        EndDate: '2026-12-31',
        MonthlyRent: 1200.00,
        SecurityDeposit: 1200.00,
        Status: 'Active',
        BillingDayOfMonth: 1,
      } as any;
    }

    if (url.includes('/vendors')) {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return {
          VendorCode: `v-${Math.floor(1000 + Math.random() * 9000)}`,
          VendorName: body.VendorName || 'Carpintería Express',
          Status: 'Active',
        } as any;
      }
      return {
        VendorCode: 'v0018',
        VendorName: 'Plumbing Experts Inc',
        Status: 'Active',
      } as any;
    }

    if (url.includes('/documents')) {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return {
          AttachmentID: `doc-${Math.floor(100000 + Math.random() * 900000)}`,
          EntityType: body.EntityType || 'Lease',
          EntityKey: body.EntityKey || 'lease-992',
          FileName: body.FileName || 'contrato.pdf',
          FileType: body.FileType || 'pdf',
          DateCreated: new Date().toISOString(),
        } as any;
      }
      return [
        {
          AttachmentID: 'doc-1029',
          EntityType: 'Lease',
          EntityKey: 'lease-992',
          FileName: 'lease_agreement.pdf',
          FileType: 'pdf',
          DateCreated: '2026-01-01T12:00:00Z',
        }
      ] as any;
    }

    // Default mock response
    return { success: true, simulated: true } as any;
  }

  private simulateSoapResponse(action: string): string {
    if (action.includes('ImportResidentScreening') || action.includes('GetResidentDetails')) {
      return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetResidentDetailsResponse xmlns="http://tempuri.org/YardiWebServices">
      <GetResidentDetailsResult>
        <Status>Success</Status>
        <Data>
          <Resident>
            <TenantCode>t001842</TenantCode>
            <PropertyCode>prop_vancouver_01</PropertyCode>
            <UnitCode>u101</UnitCode>
            <FirstName>Simulated_Soap_FirstName</FirstName>
            <LastName>Simulated_Soap_LastName</LastName>
            <Email>soap.simulated@example.com</Email>
            <Status>Current</Status>
          </Resident>
        </Data>
      </GetResidentDetailsResult>
    </GetResidentDetailsResponse>
  </soap:Body>
</soap:Envelope>`;
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <YardiGenericResponse xmlns="http://tempuri.org/YardiWebServices">
      <YardiGenericResult>
        <Status>Success</Status>
        <Message>Acción SOAP ${action} simulada exitosamente.</Message>
      </YardiGenericResult>
    </YardiGenericResponse>
  </soap:Body>
</soap:Envelope>`;
  }
}
