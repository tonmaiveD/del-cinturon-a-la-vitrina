/**
 * Aceleración de una partícula de masa despreciable en el marco heliocéntrico EQJ, con las
 * posiciones de los cuerpos perturbadores dadas por astronomy-engine (HelioVector).
 *
 * El marco heliocéntrico no es inercial: se incluye el término indirecto (aceleración del Sol
 * debida a cada perturbador). Se eligió este marco y no el baricéntrico porque `BaryState` de
 * astronomy-engine define el baricentro solo con Sol + Júpiter…Neptuno, lo que deja una
 * aceleración espuria del marco del orden de GM⊕/(1 AU)².
 *
 * Unidades: AU, días; GM en AU³/día² (astronomy-engine, valores DE405).
 */
import * as Astro from 'astronomy-engine';
import type { Derivada } from './integrador';

export type Cuerpo =
  | 'Mercury'
  | 'Venus'
  | 'Earth'
  | 'Moon'
  | 'EMB'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune';

export interface Perturbador {
  cuerpo: Cuerpo;
  /** GM en AU³/día². */
  gm: number;
}

export const gm = (c: Cuerpo | 'Sun'): number => Astro.MassProduct(c as Astro.Body);

/** Perturbadores para el encuentro con la Tierra: Tierra y Luna por separado + resto. */
export const PERTURBADORES_ENCUENTRO: Perturbador[] = (
  ['Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'] as const
).map((cuerpo) => ({ cuerpo, gm: gm(cuerpo) }));

/**
 * Misma física que `GravitySimulator` de astronomy-engine (Tierra+Luna como una masa en el
 * centro de la Tierra). Se usa solo para validar contra esa implementación.
 */
export const PERTURBADORES_GRAVSIM: Perturbador[] = [
  { cuerpo: 'Mercury', gm: gm('Mercury') },
  { cuerpo: 'Venus', gm: gm('Venus') },
  { cuerpo: 'Earth', gm: gm('Earth') + gm('Moon') },
  { cuerpo: 'Mars', gm: gm('Mars') },
  { cuerpo: 'Jupiter', gm: gm('Jupiter') },
  { cuerpo: 'Saturn', gm: gm('Saturn') },
  { cuerpo: 'Uranus', gm: gm('Uranus') },
  { cuerpo: 'Neptune', gm: gm('Neptune') },
];

/**
 * Ecuación de movimiento y = [x, y, z, vx, vy, vz] heliocéntrico EQJ; `t` en días UT desde
 * J2000 (convención de astronomy-engine).
 */
export function derivadaHeliocentrica(
  perturbadores: Perturbador[] = PERTURBADORES_ENCUENTRO,
): Derivada {
  const muSol = gm('Sun');
  return (t, y, dy) => {
    const tiempo = Astro.MakeTime(t);
    const [x, yy, z] = [y[0]!, y[1]!, y[2]!];
    const r2 = x * x + yy * yy + z * z;
    const s0 = -muSol / (r2 * Math.sqrt(r2));
    let ax = s0 * x;
    let ay = s0 * yy;
    let az = s0 * z;
    for (const { cuerpo, gm: mu } of perturbadores) {
      const p = Astro.HelioVector(cuerpo as Astro.Body, tiempo);
      const dx = p.x - x;
      const dyy = p.y - yy;
      const dz = p.z - z;
      const d2 = dx * dx + dyy * dyy + dz * dz;
      const sd = mu / (d2 * Math.sqrt(d2));
      const p2 = p.x * p.x + p.y * p.y + p.z * p.z;
      const sp = mu / (p2 * Math.sqrt(p2)); // término indirecto
      ax += sd * dx - sp * p.x;
      ay += sd * dyy - sp * p.y;
      az += sd * dz - sp * p.z;
    }
    dy[0] = y[3]!;
    dy[1] = y[4]!;
    dy[2] = y[5]!;
    dy[3] = ax;
    dy[4] = ay;
    dy[5] = az;
  };
}

/** Ecuación de movimiento kepleriana alrededor del origen (para tests y comparación). */
export function derivadaDosCuerpos(mu: number): Derivada {
  return (_t, y, dy) => {
    const r2 = y[0]! ** 2 + y[1]! ** 2 + y[2]! ** 2;
    const s = -mu / (r2 * Math.sqrt(r2));
    dy[0] = y[3]!;
    dy[1] = y[4]!;
    dy[2] = y[5]!;
    dy[3] = s * y[0]!;
    dy[4] = s * y[1]!;
    dy[5] = s * y[2]!;
  };
}
