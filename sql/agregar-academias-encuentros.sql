-- ============================================================
-- Academias y Encuentros (el catálogo y el encuentro final)
-- app nueva del Ministerio.
-- Dos tablas nuevas con el contrato uniforme de siempre:
--   id text · version int · actualizado text · borrado bool · datos jsonb
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.academias (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  actualizado text,
  borrado boolean NOT NULL DEFAULT false,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.academias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accion_autenticado ON public.academias;
CREATE POLICY accion_autenticado ON public.academias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.encuentros (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  actualizado text,
  borrado boolean NOT NULL DEFAULT false,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.encuentros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accion_autenticado ON public.encuentros;
CREATE POLICY accion_autenticado ON public.encuentros
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
