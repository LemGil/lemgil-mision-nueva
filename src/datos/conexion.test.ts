import { describe, expect, it } from 'vitest';
import { entradoGuardado, marcarEntrado, olvidarEntrado } from './conexion';

// Almacén en memoria con la forma de localStorage para las pruebas.
const almacen = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => void almacen.set(k, v),
  removeItem: (k: string) => void almacen.delete(k),
};

describe('la entrada guardada en el equipo', () => {
  it('sin entrada previa, no hay nadie guardado', () => {
    olvidarEntrado();
    expect(entradoGuardado()).toBeNull();
  });

  it('al entrar, el correo queda guardado y «Salir» lo olvida', () => {
    marcarEntrado('lemgil@example.com');
    expect(entradoGuardado()).toBe('lemgil@example.com');
    olvidarEntrado();
    expect(entradoGuardado()).toBeNull();
  });
});
