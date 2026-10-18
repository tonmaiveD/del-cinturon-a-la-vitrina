/** Trayectorias animadas de las piezas con pedigrí (calculadas en el pipeline, una por archivo). */
import type { Muestra } from '../timeline/interpolacion';
import { cargarJson } from './recursos';

export interface TrayectoriaPieza {
  id: string;
  instante_referencia: string;
  origen: 'radiante' | 'jpl';
  punto: { lat: number; lon: number; altura_km: number };
  validacion: { dd: number; criterio: 'dd-y-z' | 'solo-dd' };
  helio_ecl_au: Muestra[];
  geo_eqj_km: Muestra[];
}

/** Carga con caché; un fallo no queda en caché, para que el reintento vuelva a pedirla. */
export function crearCargaTrayectorias(): (id: string) => Promise<TrayectoriaPieza> {
  const cache = new Map<string, Promise<TrayectoriaPieza>>();
  return (id) => {
    let p = cache.get(id);
    if (!p) {
      p = cargarJson<TrayectoriaPieza>(`data/trayectorias/${id}.json`);
      cache.set(id, p);
      p.catch(() => cache.delete(id));
    }
    return p;
  };
}
