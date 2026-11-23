import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { fijarUbicacion } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import { CENTRO_DEFECTO, puntosDelMapa, sinUbicacion, type PuntoMapa } from '../motor/mapa';
import type { VerPersonas } from '../motor/vistas';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, FilaPersona, Pestanas } from './Piezas';

interface Objetivo {
  tipo: 'persona' | 'grupo';
  id: string;
  nombre: string;
}

export default function Mapa({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [editando, setEditando] = useState(false);
  const [ver, setVer] = useState<VerPersonas>('activos');
  const [fijando, setFijando] = useState<Objetivo | null>(null);
  const [aviso, setAviso] = useState('');
  // Regla de pestañas (2026-11-23): «🗺️ Mapa» y «📍 Por fijar».
  // El mapa NO se desmonta al cambiar: se oculta con CSS y al
  // volver se le recalcula el tamaño — desmontarlo mataría la
  // instancia de Leaflet y las chinchetas.
  const [seccion, setSeccion] = useState<'mapa' | 'fijar'>('mapa');
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const fijandoRef = useRef<Objetivo | null>(null);
  fijandoRef.current = fijando;

  const recargar = useCallback(() => setRecargas((x) => x + 1), []);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const d = await aDatosMinisterio(repo);
      if (vivo) setDatos(d);
    })();
    return () => {
      vivo = false;
    };
  }, [repo, recargas]);

  // Crear el mapa cuando el contenedor ya existe (los datos cargaron).
  // Antes corría solo al montar, con la pantalla en «Cargando…»: el
  // contenedor aún no estaba y el mapa nunca nacía.
  useEffect(() => {
    if (!datos || !contenedorRef.current || mapaRef.current) return;
    const centroGuardado = localStorage.getItem('mision-nueva-mapa-centro');
    const centro = centroGuardado ? (JSON.parse(centroGuardado) as [number, number]) : CENTRO_DEFECTO;
    const mapa = L.map(contenedorRef.current).setView(centro, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapa);
    capaRef.current = L.layerGroup().addTo(mapa);
    mapa.on('click', async (e: L.LeafletMouseEvent) => {
      const objetivo = fijandoRef.current;
      if (!objetivo) return;
      const d = await aDatosMinisterio(repo);
      await fijarUbicacion(repo, d, objetivo.tipo, objetivo.id, e.latlng.lat, e.latlng.lng);
      setAviso(`📍 Ubicación fijada: ${objetivo.nombre}`);
      setFijando(null);
      recargar();
    });
    mapa.on('moveend', () => {
      const c = mapa.getCenter();
      localStorage.setItem('mision-nueva-mapa-centro', JSON.stringify([c.lat, c.lng]));
    });
    mapaRef.current = mapa;
    mapa.invalidateSize();
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, [repo, recargar, datos]);

  // Al volver a la pestaña del mapa, Leaflet recalcula su tamaño.
  useEffect(() => {
    if (seccion === 'mapa') mapaRef.current?.invalidateSize();
  }, [seccion]);

  const puntos: PuntoMapa[] = datos ? puntosDelMapa(datos, ver) : [];

  // Redibujar las chinchetas cuando cambian los datos, el modo o el filtro «Ver».
  useEffect(() => {
    const capa = capaRef.current;
    if (!capa || !datos) return;
    capa.clearLayers();
    for (const punto of puntosDelMapa(datos, ver)) {
      const marker = L.marker([punto.lat, punto.lng], {
        draggable: editando,
        icon: L.divIcon({
          className: 'mapa-pin-icono',
          html: `<div class="mapa-pin">${punto.emoji}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      });
      marker.bindTooltip(punto.nombre, { direction: 'top' });
      if (editando) {
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const d = await aDatosMinisterio(repo);
          await fijarUbicacion(repo, d, punto.tipo, punto.id, pos.lat, pos.lng);
          setAviso(`📍 Ubicación movida: ${punto.nombre}`);
          recargar();
        });
      }
      marker.addTo(capa);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, editando, ver, repo, recargar]);

  if (!datos) return <p className="cargando">Cargando…</p>;
  const sin = sinUbicacion(datos, ver);

  const fijarConGPS = () => {
    if (!fijando) return;
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const d = await aDatosMinisterio(repo);
      await fijarUbicacion(repo, d, fijando.tipo, fijando.id, pos.coords.latitude, pos.coords.longitude);
      setAviso(`📍 Ubicación fijada por GPS: ${fijando.nombre}`);
      setFijando(null);
      recargar();
    });
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="📍 Mapa">
        <button
          className="btn"
          onClick={() => {
            if (!editando) setSeccion('mapa');
            setEditando((v) => !v);
          }}
        >
          {editando ? '✓ Terminar edición' : '✏️ Editar ubicaciones'}
        </button>
      </CabeceraPagina>
      <GuiaPagina texto="Dónde vive cada uno. Las chinchetas se fijan a mano y se pueden arrastrar para corregirlas; ayuda a visitar y a ver la congregación por zonas." />
      <Pestanas
        opciones={[
          { id: 'mapa', etiqueta: '🗺️ Mapa' },
          { id: 'fijar', etiqueta: `📍 Por fijar (${sin.length})` },
        ]}
        activa={seccion}
        onCambiar={(id) => setSeccion(id as 'mapa' | 'fijar')}
      />
      <Buscador>
        <span className="seg" role="group" aria-label="Ver">
          <button type="button" aria-pressed={ver === 'activos'} onClick={() => setVer('activos')}>Activos</button>
          <button type="button" aria-pressed={ver === 'bajas'} onClick={() => setVer('bajas')}>Bajas</button>
          <button type="button" aria-pressed={ver === 'todos'} onClick={() => setVer('todos')}>Todos</button>
        </span>
      </Buscador>
      <p className="tenue">
        {puntos.length} chinchetas fijadas. Las chinchetas son manuales (GPS o toque): la
        dirección escrita no se convierte sola.
        {editando && ' En edición, arrastra cualquier chincheta y se guarda al soltar.'}
      </p>
      {aviso && <p className="aviso aviso-verde">{aviso}</p>}

      {seccion === 'mapa' && fijando && (
        <section className="tarjeta">
          <p>
            Fijando: <strong>{fijando.nombre}</strong> — toca el mapa donde vive, o usa el GPS
            del equipo.
          </p>
          <div className="form-acciones">
            <button className="btn btn-dorado" onClick={fijarConGPS}>📡 Usar mi ubicación (GPS)</button>
            <button className="btn" onClick={() => setFijando(null)}>Cancelar</button>
          </div>
        </section>
      )}

      <div
        ref={contenedorRef}
        className="mapa-contenedor"
        style={seccion === 'mapa' ? undefined : { display: 'none' }}
      />

      {seccion === 'fijar' && (
        <section className="tarjeta">
          <h2>📍 Por fijar</h2>
          <p className="tenue">Toca una ficha y te llevo al mapa para fijar su chincheta.</p>
          <ul className="lista-personas">
            {sin.map((s) => (
              <li key={s.tipo + s.id}>
                <FilaPersona
                  nombre={`${s.tipo === 'grupo' ? '🏠' : '👤'} ${s.nombre}`}
                  meta="sin chincheta — fijar"
                  onClick={() => {
                    setFijando(s);
                    setSeccion('mapa');
                  }}
                />
              </li>
            ))}
            {sin.length === 0 && (
              <li className="tenue">
                {ver === 'todos' ? 'Todas las fichas tienen su chincheta.' : 'Sin fichas por fijar en esta vista.'}
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
