/** Estado compartible por URL: modo, pieza o evento, instante, vista y escala. */
export type Vista = 'tierra' | 'sistema-solar';
export type Modo = 'pedigri' | 'cneos';

export interface EstadoUrl {
  modo?: Modo;
  pieza: string;
  /** Evento del CNEOS seleccionado (solo en modo «cneos»). */
  evento?: string;
  t?: number;
  vista: Vista;
  escalaVisual: boolean;
}

const VISTAS: Vista[] = ['tierra', 'sistema-solar'];

export function leerEstadoUrl(busqueda: string, porDefecto: EstadoUrl): EstadoUrl {
  const p = new URLSearchParams(busqueda);
  const t = p.get('t') ? Date.parse(p.get('t')!) : NaN;
  const vista = p.get('vista') as Vista | null;
  const evento = p.get('evento') ?? porDefecto.evento;
  return {
    modo: p.get('modo') === 'cneos' ? 'cneos' : (porDefecto.modo ?? 'pedigri'),
    pieza: p.get('pieza') ?? porDefecto.pieza,
    ...(evento !== undefined && { evento }),
    t: Number.isFinite(t) ? t : porDefecto.t,
    vista: vista && VISTAS.includes(vista) ? vista : porDefecto.vista,
    escalaVisual: p.has('escala') ? p.get('escala') !== 'real' : porDefecto.escalaVisual,
  };
}

export function escribirEstadoUrl(e: EstadoUrl): string {
  const p = new URLSearchParams();
  if (e.modo === 'cneos') {
    p.set('modo', 'cneos');
    if (e.evento) p.set('evento', e.evento);
  } else p.set('pieza', e.pieza);
  if (e.t !== undefined) p.set('t', new Date(e.t).toISOString().replace('.000Z', 'Z'));
  p.set('vista', e.vista);
  p.set('escala', e.escalaVisual ? 'visual' : 'real');
  return `?${p.toString()}`;
}
