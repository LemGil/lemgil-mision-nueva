-- ============================================================
-- Campañas y Entregas de Manos Abiertas — app nueva del Ministerio
-- Dos tablas nuevas con el contrato uniforme de siempre:
--   id text · version int · actualizado text · borrado bool · datos jsonb
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.campanas (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  actualizado text,
  borrado boolean NOT NULL DEFAULT false,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.campanas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accion_autenticado ON public.campanas;
CREATE POLICY accion_autenticado ON public.campanas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.entregas (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  actualizado text,
  borrado boolean NOT NULL DEFAULT false,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accion_autenticado ON public.entregas;
CREATE POLICY accion_autenticado ON public.entregas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
