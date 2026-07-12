-- 1. Asignar el rol de Super Administrador (admin) a admin@roommatefinder.com si ya existe en auth.users
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@roommatefinder.com'
);

-- 2. Asegurar que las nuevas inserciones de perfil para admin@roommatefinder.com siempre tengan el rol 'admin'
CREATE OR REPLACE FUNCTION public.check_new_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.id AND email = 'admin@roommatefinder.com'
  ) THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_new_profile_role ON public.profiles;
CREATE TRIGGER tr_check_new_profile_role
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_new_profile_role();

-- 3. Crear el trigger de seguridad BEFORE UPDATE para evitar que usuarios no administradores se auto-promuevan o promuevan a otros a roles admin/company
CREATE OR REPLACE FUNCTION public.check_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Si el llamante no es admin y está intentando asignar un rol de tipo 'admin' o 'company'
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      IF NEW.role IN ('admin', 'company') THEN
        RAISE EXCEPTION 'No tienes permisos para asignar o modificar este rol.';
      END IF;
      -- Si el rol original era admin o company, no permitir cambiarlo
      IF OLD.role IN ('admin', 'company') THEN
        RAISE EXCEPTION 'No puedes modificar un rol administrativo.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_role_update ON public.profiles;
CREATE TRIGGER tr_check_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_role_update();
