/** Estado compartible por URL: pieza, instante, vista y escala. */
export type Vista = 'tierra' | 'sistema-solar';

export interface EstadoUrl {
  pieza: string;
  t?: number;
  vista: Vista;
  escalaVisual: boolean;
}

const VISTAS: Vista[] = ['tierra', 'sistema-solar'];

export function leerEstadoUrl(busqueda: string, porDefecto: EstadoUrl): EstadoUrl {
  const p = new URLSearchParams(busqueda);
  const t = p.get('t') ? Date.parse(p.get('t')!) : NaN;
  const vista = p.get('vista') as Vista | null;
  return {
    pieza: p.get('pieza') ?? porDefecto.pieza,
    t: Number.isFinite(t) ? t : porDefecto.t,
    vista: vista && VISTAS.includes(vista) ? vista : porDefecto.vista,
    escalaVisual: p.has('escala') ? p.get('escala') !== 'real' : porDefecto.escalaVisual,
  };
}

export function escribirEstadoUrl(e: EstadoUrl): string {
  const p = new URLSearchParams();
  p.set('pieza', e.pieza);
  if (e.t !== undefined) p.set('t', new Date(e.t).toISOString().replace('.000Z', 'Z'));
  p.set('vista', e.vista);
  p.set('escala', e.escalaVisual ? 'visual' : 'real');
  return `?${p.toString()}`;
}
