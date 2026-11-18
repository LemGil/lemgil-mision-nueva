// La conexión con el proyecto propio. Si config.ts está vacío, la app
// trabaja en modo local (todo queda en el equipo) y lo dice en pantalla.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { Repo } from './repo';
import { Sincronizador } from './sync';
import { crearTransporteSupabase } from './transporte';

export const hayConexionConfigurada = () => SUPABASE_URL.trim() !== '';

export function crearCliente(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Entra con el usuario existente (correo + contraseña/PIN) y devuelve el
 * sincronizador ya conectado al espejo. */
export async function entrarYSincronizar(
  cliente: SupabaseClient,
  repo: Repo,
  correo: string,
  contrasena: string,
  alCambiar: (e: import('./sync').EstadoSync) => void,
): Promise<Sincronizador> {
  const { error } = await cliente.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });
  if (error) throw new Error(error.message);
  const sync = new Sincronizador(repo, crearTransporteSupabase(cliente), alCambiar);
  await sync.ciclo();
  return sync;
}
