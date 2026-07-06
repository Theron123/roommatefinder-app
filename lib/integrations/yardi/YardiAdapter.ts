export interface TenantYardiData {
  tenantId: string;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  balance: number;
  leaseEndDate: string;
}

/**
 * Adaptador para interactuar con la futura API de Yardi Voyager.
 * Actualmente configurado en modo MOCK (Simulación) hasta recibir credenciales de Oni.
 */
export class YardiAdapter {
  private isMockMode: boolean = true;
  private endpointUrl: string = process.env.EXPO_PUBLIC_YARDI_ENDPOINT || '';
  
  /**
   * Obtiene (PULL) el estado de un inquilino desde Yardi.
   */
  async getTenantStatus(email: string): Promise<TenantYardiData | null> {
    if (this.isMockMode) {
      console.log(`[YARDI MOCK] Jalando datos para el inquilino con email: ${email}`);
      // Simulamos latencia de red
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulamos respuesta de Yardi
      return {
        tenantId: `YRD-${Math.floor(Math.random() * 10000)}`,
        paymentStatus: 'PAID',
        balance: 0,
        leaseEndDate: '2027-01-01T00:00:00.000Z'
      };
    }

    // FUTURA IMPLEMENTACIÓN REAL CON SOAP/REST API:
    /*
    try {
      const response = await fetch(`${this.endpointUrl}/GetTenantStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml', // Asumiendo SOAP
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_YARDI_API_KEY}`
        },
        body: `<soap:Envelope ...> <email>${email}</email> </soap:Envelope>`
      });
      const data = await response.text();
      // Lógica de parseo XML a JSON...
      return parsedData;
    } catch (error) {
      console.error("[YARDI ERROR] Error conectando con Yardi:", error);
      return null;
    }
    */
    return null;
  }
}

export const yardiAdapter = new YardiAdapter();
