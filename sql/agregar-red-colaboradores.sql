-- ============================================================
-- Red de Colaboradores — app nueva del Ministerio LemGil
-- Dos tablas nuevas con el contrato uniforme de siempre:
--   id text · version int · actualizado text · borrado bool · datos jsonb
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.colaboradores (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  actualizado text,
  borrado boolean NOT NULL DEFAULT false,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accion_autenticado ON public.colaboradores;
CREATE POLICY accion_autenticado ON public.colaboradores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public."aportesRed" (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  actualizado text,
  borrado boolean NOT NULL DEFAULT false,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public."aportesRed" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accion_autenticado ON public."aportesRed";
CREATE POLICY accion_autenticado ON public."aportesRed"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
