/**
 * Trayectoria N cuerpos (Sol, planetas, Tierra, Luna) integrada hacia atrás desde un estado
 * heliocéntrico EQJ en el instante de referencia. Se guarda cada paso aceptado del integrador
 * (adaptativo: denso cerca de la Tierra). Tiempos en días relativos a la referencia.
 *   - helio: posiciones heliocéntricas eclípticas J2000 (AU), todo el intervalo
 *   - geo: posiciones geocéntricas EQJ (km) de los últimos `diasGeo` días
 */
import * as Astro from 'astronomy-engine';
import { derivadaHeliocentrica } from '../src/core/dinamica';
import { integrar } from '../src/core/integrador';
import { eqjAEcl, KM_POR_AU } from '../src/core/marcos';
import type { Vec3 } from '../src/core/vector';

export const DIAS = 365;
export const DIAS_GEO = 3;
const PASO_MAX = 0.5; // días: limita huecos en la animación

const redondear = (x: number, d: number) => Number(x.toFixed(d));

export function trayectoriaHaciaAtras(
  t: Astro.AstroTime,
  y0: number[],
  dias = DIAS,
  diasGeo = DIAS_GEO,
): { helio: number[][]; geo: number[][] } {
  const muestras: { dt: number; y: Float64Array }[] = [{ dt: 0, y: Float64Array.from(y0) }];
  integrar(derivadaHeliocentrica(), t.ut, y0, t.ut - dias, {
    rtol: 1e-11,
    atol: 1e-16,
    h0: 1e-7,
    hMax: PASO_MAX,
    alPaso: (tt, y) => {
      muestras.push({ dt: tt - t.ut, y: Float64Array.from(y) });
    },
  });
  muestras.reverse();
  const helio = muestras.map(({ dt, y }) => {
    const p = eqjAEcl([y[0]!, y[1]!, y[2]!]);
    return [redondear(dt, 7), redondear(p[0], 8), redondear(p[1], 8), redondear(p[2], 8)];
  });
  const geo = muestras
    .filter(({ dt }) => dt >= -diasGeo)
    .map(({ dt, y }) => {
      const e = Astro.HelioVector(Astro.Body.Earth, t.AddDays(dt));
      const g: Vec3 = [
        (y[0]! - e.x) * KM_POR_AU,
        (y[1]! - e.y) * KM_POR_AU,
        (y[2]! - e.z) * KM_POR_AU,
      ];
      return [redondear(dt, 9), redondear(g[0], 2), redondear(g[1], 2), redondear(g[2], 2)];
    });
  return { helio, geo };
}
