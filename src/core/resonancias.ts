/**
 * Centro nominal de las resonancias de movimiento medio p:q con Júpiter (tercera ley de Kepler):
 * a = a_J · (q/p)^(2/3). El semieje de Júpiter se obtiene de astronomy-engine (osculador).
 */
import * as Astro from 'astronomy-engine';
import { gm } from './dinamica';
import { elementosDesdeEstado } from './kepler';

export function semiejeJupiter(fecha: Date = new Date('2000-01-01T12:00:00Z')): number {
  const t = Astro.MakeTime(fecha);
  const s = Astro.HelioState(Astro.Body.Jupiter, t);
  return elementosDesdeEstado(
    { r: [s.x, s.y, s.z], v: [s.vx, s.vy, s.vz] },
    gm('Sun') + gm('Jupiter'),
    t.ut,
  ).a;
}

export const semiejeResonancia = (p: number, q: number, aJ: number = semiejeJupiter()): number =>
  aJ * (q / p) ** (2 / 3);
