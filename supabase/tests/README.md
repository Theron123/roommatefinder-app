# Tests de base de datos (pgTAP)

Tests de regresión que corren contra un Supabase local real (migraciones,
triggers, RLS) — no contra mocks. Viven en `supabase/tests/database/`.

## Correr localmente

```bash
supabase start          # levanta el stack local (Docker)
supabase db reset        # opcional: asegura un estado limpio desde las migraciones
supabase test db supabase/tests/database
```

Cada archivo `*_test.sql` corre dentro de `begin; ... rollback;`, así que no
deja datos de prueba en la base al terminar (ni al fallar a la mitad).

## Qué cubre hoy

- `profiles_role_security_test.sql` — los 5 escenarios de la regresión real de
  julio 2026 entre el trigger de protección de columnas privilegiadas y el
  trigger de bootstrap del admin (dos triggers escritos por personas
  distintas sobre la misma tabla). Agregar un test aquí cada vez que se toque
  `profiles.role`, `trust_score`, o los triggers relacionados.

## CI

Corre como el job `db-tests` en `.github/workflows/ci.yml` — es el más lento
de los tres jobs porque levanta el stack completo con Docker, así que corre
aparte de los checks rápidos de la app.
