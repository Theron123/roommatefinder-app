-- Migración para la integración PMS (Yardi Voyager) con políticas RLS robustas
-- Refina el esquema original de database-migration.sql asociando configs de compañía con sus dueños reales.

-- Crear función para updated_at si no existe
CREATE OR REPLACE FUNCTION public.handle_pms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. CONFIGURACIÓN DEL PMS POR COMPAÑÍA (MULTITENANCY)
CREATE TABLE IF NOT EXISTS public.pms_company_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    pms_provider VARCHAR(50) NOT NULL DEFAULT 'yardi', -- 'yardi', 'entrata', 'realpage', etc.
    
    -- Configuración de API / Endpoint
    api_endpoint VARCHAR(512) NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'staging', -- 'test', 'staging', 'production'
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Credenciales
    auth_username VARCHAR(255),
    auth_password_hash VARCHAR(512),
    
    -- Parámetros específicos de Yardi Voyager
    yardi_server_id VARCHAR(100),
    yardi_database VARCHAR(100),
    yardi_license_key VARCHAR(512),
    yardi_interface_entity VARCHAR(100),
    
    -- Dueño de la configuración corporativa (Landlord/Host o Admin)
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.pms_company_configs ENABLE ROW LEVEL SECURITY;

-- 2. MAPEO DE ENTIDADES (INTERNAL ID <-> EXTERNAL PMS CODE)
CREATE TABLE IF NOT EXISTS public.pms_entity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_config_id UUID NOT NULL REFERENCES public.pms_company_configs(id) ON DELETE CASCADE,
    
    -- Tipo de entidad: 'property', 'unit', 'tenant', 'lease', 'work_order', 'vendor', 'document'
    entity_type VARCHAR(50) NOT NULL,
    
    -- ID local de la aplicación (referencia a listings, profiles, contracts, etc.)
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
    
    CONSTRAINT uq_pms_entity_internal UNIQUE (company_config_id, entity_type, internal_id),
    CONSTRAINT uq_pms_entity_external UNIQUE (company_config_id, entity_type, external_code)
);

-- Habilitar RLS
ALTER TABLE public.pms_entity_mappings ENABLE ROW LEVEL SECURITY;

-- 3. AUDITORÍA Y LOGS DE SINCRONIZACIÓN
CREATE TABLE IF NOT EXISTS public.pms_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_config_id UUID NOT NULL REFERENCES public.pms_company_configs(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    entity_type VARCHAR(50) NOT NULL,
    internal_id UUID,
    external_code VARCHAR(100),
    operation VARCHAR(50) NOT NULL, -- 'create', 'update', 'fetch', 'delete', 'webhook'
    status VARCHAR(20) NOT NULL,    -- 'success', 'failure'
    payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.pms_sync_logs ENABLE ROW LEVEL SECURITY;

-- Triggers de actualización updated_at
CREATE OR REPLACE TRIGGER trigger_pms_company_configs_updated_at
    BEFORE UPDATE ON public.pms_company_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pms_updated_at();

CREATE OR REPLACE TRIGGER trigger_pms_entity_mappings_updated_at
    BEFORE UPDATE ON public.pms_entity_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pms_updated_at();

-- ==========================================================
-- POLÍTICAS DE CONTROL DE ACCESO (RLS)
-- ==========================================================

-- A. pms_company_configs:
-- 1. Admins pueden hacer todo.
-- 2. Usuarios pueden leer sus propias configuraciones de compañía.
-- 3. Usuarios pueden crear si se asignan como dueños (owner_id = auth.uid()).
-- 4. Usuarios pueden actualizar su propia configuración.

CREATE POLICY "Admins have full access to company configs"
    ON public.pms_company_configs FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners can view their own company configs"
    ON public.pms_company_configs FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their own company configs"
    ON public.pms_company_configs FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own company configs"
    ON public.pms_company_configs FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own company configs"
    ON public.pms_company_configs FOR DELETE TO authenticated
    USING (owner_id = auth.uid());


-- B. pms_entity_mappings:
-- 1. Admins tienen acceso completo.
-- 2. El dueño de la configuración de compañía (`company_config_id` -> `owner_id`) tiene acceso completo a los mapeos de su compañía.
-- 3. Un inquilino/seeker puede ver mapeos correspondientes a su propio profile_id (si `internal_id = auth.uid()`).

CREATE POLICY "Admins have full access to entity mappings"
    ON public.pms_entity_mappings FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Company owners can manage mappings"
    ON public.pms_entity_mappings FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pms_company_configs c
            WHERE c.id = pms_entity_mappings.company_config_id AND c.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pms_company_configs c
            WHERE c.id = pms_entity_mappings.company_config_id AND c.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own tenant mappings"
    ON public.pms_entity_mappings FOR SELECT TO authenticated
    USING (
        entity_type = 'tenant' AND internal_id = auth.uid()
    );


-- C. pms_sync_logs:
-- 1. Admins tienen acceso completo.
-- 2. El dueño de la configuración de compañía asociada puede ver e insertar logs.

CREATE POLICY "Admins have full access to sync logs"
    ON public.pms_sync_logs FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Company owners can view and insert sync logs"
    ON public.pms_sync_logs FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pms_company_configs c
            WHERE c.id = pms_sync_logs.company_config_id AND c.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pms_company_configs c
            WHERE c.id = pms_sync_logs.company_config_id AND c.owner_id = auth.uid()
        )
    );

-- Índices optimizados
CREATE INDEX IF NOT EXISTS idx_pms_entity_mappings_lookup
    ON public.pms_entity_mappings (company_config_id, entity_type, internal_id);

CREATE INDEX IF NOT EXISTS idx_pms_entity_mappings_external
    ON public.pms_entity_mappings (company_config_id, entity_type, external_code);

CREATE INDEX IF NOT EXISTS idx_pms_sync_logs_recent
    ON public.pms_sync_logs (company_config_id, status, created_at DESC);
