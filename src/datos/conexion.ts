// La conexión con el proyecto propio. Si config.ts está vacío, la app
// trabaja en modo local (todo queda en el equipo) y lo dice en pantalla.
//
// La sesión se queda en el equipo: al refrescar la página o al abrir la
// app sin internet, se entra directo a los datos locales — la
// sincronización se pone al día cuando vuelve la conexión. La contraseña
// solo se pide la primera vez (o tras «Salir»).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { Repo } from './repo';
import { Sincronizador, type EstadoSync } from './sync';
import { crearTransporteSupabase } from './transporte';

export const hayConexionConfigurada = () => SUPABASE_URL.trim() !== '';

export function crearCliente(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function crearSincronizador(
  cliente: SupabaseClient,
  repo: Repo,
  alCambiar: (e: EstadoSync) => void,
): Sincronizador {
  return new Sincronizador(repo, crearTransporteSupabase(cliente), alCambiar);
}

// — La entrada guardada en este equipo. —
const CLAVE_ENTRADO = 'mision-nueva-entrado';

export function marcarEntrado(correo: string): void {
  try {
    localStorage.setItem(CLAVE_ENTRADO, correo);
  } catch {
    /* sin almacenamiento: la entrada vale solo por esta vez */
  }
}

export function entradoGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_ENTRADO);
  } catch {
    return null;
  }
}

export function olvidarEntrado(): void {
  try {
    localStorage.removeItem(CLAVE_ENTRADO);
  } catch {
    /* nada que olvidar */
  }
}

/** Entra con el usuario existente (correo + contraseña/PIN) y devuelve el
 * sincronizador ya conectado al espejo. La entrada queda guardada en el
 * equipo para no volver a pedirla en cada refresco. */
export async function entrarYSincronizar(
  cliente: SupabaseClient,
  repo: Repo,
  correo: string,
  contrasena: string,
  alCambiar: (e: EstadoSync) => void,
): Promise<Sincronizador> {
  const { error } = await cliente.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });
  if (error) throw new Error(error.message);
  marcarEntrado(correo);
  const sync = crearSincronizador(cliente, repo, alCambiar);
  await sync.ciclo();
  return sync;
}

/** Al abrir la app: recupera la sesión que Supabase guarda en el equipo,
 * sin pedir la contraseña. Devuelve null si no hay sesión viva. Nunca
 * cuelga el arranque: si la red no responde en unos segundos, se sigue
 * con la entrada guardada. El ciclo de sync corre en segundo plano. */
export async function restaurarSesion(
  cliente: SupabaseClient,
  repo: Repo,
  alCambiar: (e: EstadoSync) => void,
): Promise<Sincronizador | null> {
  try {
    const sesion = await Promise.race([
      cliente.auth.getSession().then((r) => r.data.session),
      new Promise<null>((res) => setTimeout(() => res(null), 6000)),
    ]);
    if (!sesion) return null;
    const sync = crearSincronizador(cliente, repo, alCambiar);
    void sync.ciclo().catch(() => undefined);
    return sync;
  } catch {
    return null;
  }
}
