-- ============================================================
-- Ministerios (la ficha propia de cada ministerio)
-- app nueva del Ministerio.
-- Una tabla nueva con el contrato uniforme de siempre:
--   id text · version int · actualizado text · borrado bool · datos jsonb
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ministerios (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  actualizado text,
  borrado boolean NOT NULL DEFAULT false,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.ministerios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accion_autenticado ON public.ministerios;
CREATE POLICY accion_autenticado ON public.ministerios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
