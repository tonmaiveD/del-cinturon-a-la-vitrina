/**
 * Textos que describen la escena (descripción accesible, fecha relativa, aviso de escala y
 * leyenda de capas), como funciones puras de una instantánea del estado. Sin Three.js ni DOM
 * (salvo la leyenda, que solo crea nodos): se prueban sin navegador.
 */
import type { EventoCneos } from '../cneos/eventos';
import { t } from '../i18n';
import { fecha as fechaLocal, numero } from '../i18n/formato';
import type { NombreVista } from '../scene/escena';
import { ALTURA_INICIO_KM } from '../scene/trayectoria-entrada';
import type { Catalogo, PiezaCatalogo } from './catalogo';
import type { Modo } from './estado-url';
import { coordenada, nombrePieza } from './panel-pieza';

export type Clave = Parameters<typeof t>[0];
export const DIA_MS = 86400000;

export const formatoFecha = (d: Date) =>
  fechaLocal(d, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' });
const coord = (v: number, pos: string, neg: string) =>
  `${numero(Math.abs(v), { maximumFractionDigits: 1 })}° ${v >= 0 ? pos : neg}`;

/** Lo que las descripciones necesitan de la trayectoria animada de una pieza. */
export interface TrayectoriaDescrita {
  id: string;
  origen: 'radiante' | 'jpl';
  punto: { altura_km: number };
  validacion: { dd: number };
}

/** Instantánea del estado de la escena que describen los textos. */
export interface EstadoDescrito {
  modo: Modo;
  vista: NombreVista;
  /** Instante de referencia de lo seleccionado (ms). */
  impacto: number;
  catalogo: Catalogo;
  pieza: PiezaCatalogo;
  /** Piezas visibles con el filtro actual. */
  nVisibles: number;
  /** Bólido de Chelyabinsk según el CNEOS. */
  bolido: { fecha: Date; alturaKm: number; latGrados: number; lonGrados: number };
  /** Órbitas de la nube de Chelyabinsk. */
  nOrbitasChelyabinsk: number;
  /** Trayectoria animada cargada (de una pieza que no es Chelyabinsk), o null. */
  trayPieza: TrayectoriaDescrita | null;
  /** Órbitas de la nube de la pieza seleccionada en la vista solar (0 si aún no hay). */
  nClonesSeleccion: number;
  /** Método de la nube de la pieza (catalogo-solar), si ya se cargaron las nubes. */
  metodoNube?: string;
  /** Solo en modo CNEOS, con sus datos cargados. */
  cneos?: { evento: EventoCneos; nVisibles: number; consultado: string; nClones: number };
}

/** Pico de brillo (Chelyabinsk y CNEOS) o instante de referencia (las demás piezas). */
const conPico = (e: Pick<EstadoDescrito, 'modo' | 'pieza'>) =>
  e.modo === 'cneos' || e.pieza.id === 'chelyabinsk';

export function textoFecha(ms: number, e: Pick<EstadoDescrito, 'modo' | 'pieza' | 'impacto'>) {
  const dias = (e.impacto - ms) / DIA_MS;
  const pico = conPico(e);
  const rel =
    dias < 1 / 1440
      ? t(pico ? 'tiempo.en-impacto' : 'tiempo.en-referencia')
      : t(pico ? 'tiempo.antes' : 'tiempo.antes-referencia', {
          dias:
            dias >= 1
              ? `${numero(dias, { maximumFractionDigits: 1 })} d`
              : `${numero(dias * 24, { maximumFractionDigits: 1 })} h`,
        });
  return t('tiempo.relativo', { fecha: formatoFecha(new Date(ms)), rel });
}

/** Texto del botón que lleva al final del recorrido. */
export const claveIrAlFinal = (e: Pick<EstadoDescrito, 'modo' | 'pieza'>): Clave =>
  conPico(e) ? 'tiempo.ir-pico' : 'tiempo.ir-referencia';

const fuenteCorta = (c: Catalogo, id: string) => c.fuentes[id] ?? id;

function descripcionRegiones(c: Catalogo): string {
  const zona = (id: string) => c.zonas.find((z) => z.id === id);
  return t('desc.regiones', {
    f_hungaria: (zona('hungaria')?.fuentes ?? []).map((f) => fuenteCorta(c, f)).join('; '),
    f_phocaea: (zona('phocaea')?.fuentes ?? []).map((f) => fuenteCorta(c, f)).join('; '),
    resonancias: c.resonancias.map((r) => `${r.p}:${r.q}`).join(', '),
  });
}

function descripcionCneos(e: EstadoDescrito, c: NonNullable<EstadoDescrito['cneos']>): string {
  const fecha = formatoFecha(new Date(e.impacto));
  const ev = c.evento;
  if (e.vista === 'tierra')
    return t('desc.tierra.cneos', {
      fecha,
      n: c.nVisibles,
      tray:
        ev.v_ecef_kms && ev.alt_km !== undefined
          ? t('desc.tierra.cneos.tray', { alto: ALTURA_INICIO_KM })
          : ev.lat === undefined
            ? t('desc.tierra.cneos.sin-ubicacion')
            : '',
      consultado: formatoFecha(new Date(c.consultado)),
    });
  return c.nClones > 0
    ? t('desc.sistema-solar.cneos', { fecha, n: c.nClones })
    : t('desc.sistema-solar.cneos.sin', { fecha });
}

/**
 * Descripción de la nube según su método (Almahata Sitta: órbita telescópica de JPL;
 * Chelyabinsk: elementos condicionados al encuentro).
 */
function clavePieza(metodo: string | undefined): Clave {
  if (metodo === 'elementos') return 'desc.sistema-solar.pieza.jpl';
  if (metodo === 'elementos-condicionados') return 'desc.sistema-solar.pieza.condicionada';
  return 'desc.sistema-solar.pieza';
}

/** Descripción accesible de lo que muestra la escena. */
export function descripcionVista(e: EstadoDescrito): string {
  if (e.modo === 'cneos' && e.cneos) return descripcionCneos(e, e.cneos);
  const p = e.pieza;
  const c = e.catalogo;
  if (p.id === 'chelyabinsk')
    return e.vista === 'tierra'
      ? t('desc.tierra', {
          fecha: formatoFecha(e.bolido.fecha),
          alt: numero(e.bolido.alturaKm),
          lat: coord(e.bolido.latGrados, 'N', 'S'),
          lon: coord(e.bolido.lonGrados, 'E', 'O'),
        })
      : `${t('desc.sistema-solar', { fecha: formatoFecha(e.bolido.fecha), n: e.nOrbitasChelyabinsk })} ${descripcionRegiones(c)}`;
  const fecha = formatoFecha(new Date(e.impacto));
  const tray = e.trayPieza?.id === p.id ? e.trayPieza : null;
  if (e.vista === 'tierra')
    return (
      t('desc.tierra.pieza', {
        fecha,
        nombre: nombrePieza(p),
        lat: p.punto ? coordenada(p.punto.lat, 'N', 'S') : '—',
        lon: p.punto ? coordenada(p.punto.lon, 'E', 'O') : '—',
        n: e.nVisibles,
      }) +
      (tray
        ? ` ${t(tray.origen === 'jpl' ? 'desc.tierra.pieza.aprox.jpl' : 'desc.tierra.pieza.aprox', { alto: tray.punto.altura_km })}`
        : '')
    );
  const parametros = {
    fecha,
    nombre: nombrePieza(p),
    n: e.nClonesSeleccion,
    fuente: p.orbita ? fuenteCorta(c, p.orbita.fuente) : '—',
  };
  if (tray)
    return `${t(clavePieza(e.metodoNube), { ...parametros, regiones: '' }).trimEnd()}${
      tray.origen === 'jpl'
        ? t('desc.sistema-solar.pieza.tray.jpl', {
            dd: numero(tray.validacion.dd, { maximumFractionDigits: 5 }),
          })
        : t('desc.sistema-solar.pieza.tray')
    } ${descripcionRegiones(c)}`;
  return t(clavePieza(e.metodoNube), { ...parametros, regiones: descripcionRegiones(c) });
}

/** Mensaje de llegada al final del recorrido (se antepone a la descripción). */
export function textoLlegada(e: Pick<EstadoDescrito, 'pieza' | 'bolido' | 'impacto'>): string {
  return e.pieza.id === 'chelyabinsk'
    ? t('narr.final', { fecha: formatoFecha(e.bolido.fecha) })
    : t('narr.final.pieza', {
        nombre: nombrePieza(e.pieza),
        fecha: formatoFecha(new Date(e.impacto)),
      });
}

/** Aviso de escala: qué está exagerado en la vista actual. */
export function textoAvisoEscala(
  escalaVisual: boolean,
  vista: NombreVista,
  conMeteoroide: boolean,
  exageracion: { sol: number; planetas: number; jupiter: number },
): string {
  if (!escalaVisual) return t('escala.real');
  const clave: Clave =
    vista === 'tierra'
      ? conMeteoroide
        ? 'escala.visual.tierra'
        : 'escala.visual.tierra.pieza'
      : conMeteoroide
        ? 'escala.visual.sistema-solar'
        : 'escala.visual.sistema-solar.sin-meteoroide';
  return t(clave, exageracion);
}

/**
 * Leyenda por capa de la vista solar (M27): fuente y método de lo que se dibuja, con la
 * advertencia de que la densidad de una nube no es una probabilidad calibrada. Los colores
 * son los de src/scene/catalogo-solar.ts, sistema-solar.ts y cneos-solar.ts.
 */
export function capasLeyenda(
  e: Pick<EstadoDescrito, 'modo' | 'pieza'>,
  conTrayectoria: boolean,
): [string, Clave][] {
  if (e.modo === 'cneos') return [['#6fd3ff', 'capas.cneos']];
  return [
    ...(e.pieza.id === 'chelyabinsk'
      ? ([
          ['#ff9a3c', 'capas.chelyabinsk'],
          ['#ffd08a', 'capas.estela'],
        ] as [string, Clave][])
      : ([
          ['#6fd3ff', 'capas.seleccion'],
          ...(conTrayectoria ? [['#ffe2b8', 'capas.estela']] : []),
        ] as [string, Clave][])),
    ['#8f9bd6', 'capas.otras'],
    ['#9be7a8', 'capas.hungaria'],
    ['#f0b6ff', 'capas.phocaea'],
    ['#ffd36b', 'capas.resonancias'],
  ];
}

/** Elementos de la lista de la leyenda (con la nota sobre la densidad al final). */
export function nodosLeyenda(capas: [string, Clave][]): HTMLLIElement[] {
  const items = capas.map(([color, clave]) => {
    const li = document.createElement('li');
    const punto = document.createElement('span');
    punto.className = 'punto';
    punto.style.background = color;
    punto.setAttribute('aria-hidden', 'true');
    li.append(punto, t(clave));
    return li;
  });
  const nota = document.createElement('li');
  nota.className = 'nota';
  nota.textContent = t('capas.densidad');
  return [...items, nota];
}
