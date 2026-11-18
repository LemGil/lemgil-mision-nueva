import { useState } from 'react';
import { SUPABASE_EMAIL } from '../datos/config';

interface Props {
  onEntrar: (correo: string, contrasena: string) => Promise<void>;
}

export default function Entrar({ onEntrar }: Props) {
  const [correo, setCorreo] = useState(SUPABASE_EMAIL);
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    setEntrando(true);
    try {
      await onEntrar(correo.trim(), contrasena);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEntrando(false);
    }
  };

  return (
    <div className="entrar">
      <form className="entrar-caja" onSubmit={enviar}>
        <h1>Ministerio LemGil</h1>
        <p className="entrar-sub">App de gestión — entra con tu usuario del proyecto</p>
        <label>
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="aviso aviso-rojo">{error}</p>}
        <button className="btn btn-dorado" type="submit" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
