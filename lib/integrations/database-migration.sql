-- =====================================================================
-- MIGRACIÓN DE BASE DE DATOS PARA LA INTEGRACIÓN CON YARDI VOYAGER / PMS
-- =====================================================================
-- Este script define la estructura necesaria para soportar integraciones con
-- sistemas de gestión de propiedades (PMS) de forma multitenant y modular.
-- Compatible con PostgreSQL y diseñado para ejecutarse en Supabase.

-- Habilitar extensión UUID si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONFIGURACIÓN DEL PMS POR COMPAÑÍA (MULTITENANCY)
-- Almacena los parámetros de conexión para cada empresa de administración de propiedades.
CREATE TABLE IF NOT EXISTS public.pms_company_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    pms_provider VARCHAR(50) NOT NULL DEFAULT 'yardi', -- 'yardi', 'entrata', 'realpage', etc.
    
    -- Configuración de API / Endpoint
    api_endpoint VARCHAR(512) NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'staging', -- 'test', 'staging', 'production'
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Credenciales (cifradas/ofuscadas en producción real)
    auth_username VARCHAR(255),
    auth_password_hash VARCHAR(512),
    
    -- Parámetros específicos de Yardi Voyager
    yardi_server_id VARCHAR(100),
    yardi_database VARCHAR(100),
    yardi_license_key VARCHAR(512),
    yardi_interface_entity VARCHAR(100), -- Entidad de interfaz para SOAP (ej. RentCafe, ResidentScreening)
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar seguridad de nivel de fila (RLS) en Supabase
ALTER TABLE public.pms_company_configs ENABLE ROW LEVEL SECURITY;

-- 2. MAPEO DE ENTIDADES (INTERNAL ID <-> EXTERNAL PMS CODE)
-- Relaciona los registros locales (UUIDs) con los códigos del PMS (alfanuméricos).
CREATE TABLE IF NOT EXISTS public.pms_entity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_config_id UUID NOT NULL REFERENCES public.pms_company_configs(id) ON DELETE CASCADE,
    
    -- Tipo de entidad: 'property', 'unit', 'tenant', 'lease', 'work_order', 'vendor', 'document'
    entity_type VARCHAR(50) NOT NULL,
    
    -- ID local de la aplicación (generalmente referencia a 'listings', 'profiles', 'contracts', etc.)
    internal_id UUID NOT NULL,
    
    -- Código o ID identificador en el PMS de Yardi (ej. 'prop101', 'unit304', 't0024823')
    external_code VARCHAR(100) NOT NULL,
    
    -- Estado de la sincronización
    sync_status VARCHAR(50) NOT NULL DEFAULT 'synced', -- 'synced', 'failed', 'pending_outbound', 'pending_inbound'
    error_message TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restricciones de unicidad para evitar duplicados en la misma compañía
    CONSTRAINT uq_pms_entity_internal UNIQUE (company_config_id, entity_type, internal_id),
    CONSTRAINT uq_pms_entity_external UNIQUE (company_config_id, entity_type, external_code)
);

-- Crear índices para acelerar búsquedas en sincronización
CREATE INDEX IF NOT EXISTS idx_pms_entity_mappings_lookup 
ON public.pms_entity_mappings (company_config_id, entity_type, internal_id);

CREATE INDEX IF NOT EXISTS idx_pms_entity_mappings_external 
ON public.pms_entity_mappings (company_config_id, entity_type, external_code);

ALTER TABLE public.pms_entity_mappings ENABLE ROW LEVEL SECURITY;

-- 3. AUDITORÍA Y LOGS DE SINCRONIZACIÓN
-- Registra todas las transacciones entrantes y salientes para diagnóstico de fallos.
CREATE TABLE IF NOT EXISTS public.pms_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_config_id UUID NOT NULL REFERENCES public.pms_company_configs(id) ON DELETE CASCADE,
    
    -- Dirección del flujo de datos
    direction VARCHAR(20) NOT NULL, -- 'inbound' (de Yardi a App), 'outbound' (de App a Yardi)
    
    -- Tipo de entidad y referencias
    entity_type VARCHAR(50) NOT NULL,
    internal_id UUID,
    external_code VARCHAR(100),
    
    -- Detalles de la operación
    operation VARCHAR(50) NOT NULL, -- 'create', 'update', 'fetch', 'delete', 'webhook'
    status VARCHAR(20) NOT NULL,    -- 'success', 'failure'
    
    -- Carga útil para análisis
    payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    
    -- Tiempo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para consultar logs recientes por entidad o estado
CREATE INDEX IF NOT EXISTS idx_pms_sync_logs_recent 
ON public.pms_sync_logs (company_config_id, status, created_at DESC);

ALTER TABLE public.pms_sync_logs ENABLE ROW LEVEL SECURITY;

-- 4. PROCEDIMIENTO Y TRIGGER PARA AUTOMATIZAR EL CAMPO 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_pms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_pms_company_configs_updated_at
    BEFORE UPDATE ON public.pms_company_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pms_updated_at();

CREATE OR REPLACE TRIGGER trigger_pms_entity_mappings_updated_at
    BEFORE UPDATE ON public.pms_entity_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pms_updated_at();

-- 5. POLÍTICAS DE SEGURIDAD (RLS) BÁSICAS PARA DESARROLLO/ADMIN
-- Permite que los administradores autenticados puedan leer y escribir en estas tablas.
CREATE POLICY "Allow read/write access to authenticated admins only" 
ON public.pms_company_configs
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read/write access to authenticated admins only" 
ON public.pms_entity_mappings
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read/write access to authenticated admins only" 
ON public.pms_sync_logs
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);
