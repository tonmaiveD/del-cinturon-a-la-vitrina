/**
 * Monte Carlo sobre el vector de velocidad de un bólido: se perturban el módulo y la
 * dirección (ascensión recta/declinación del vector en ejes ECEF; la rotación sobre z de
 * ECEF a ecuatorial conserva la declinación y desplaza la AR uniformemente).
 */
import { crearAzar } from './azar';
import {
  orbitaDesdeBolido,
  type OpcionesOrbita,
  type RegistroBolido,
  type ResultadoOrbita,
} from './orbita-bolido';
import { GRAD, norma, type Vec3 } from './vector';

export interface IncertidumbreVelocidad {
  /** σ del módulo (km/s). */
  sigmaV: number;
  /** σ de la ascensión recta del radiante (grados de AR). */
  sigmaRaGrados: number;
  /** σ de la declinación del radiante (grados). */
  sigmaDecGrados: number;
}

export function perturbarVelocidad(
  v: Vec3,
  inc: IncertidumbreVelocidad,
  normal: () => number,
): Vec3 {
  const m = norma(v);
  const ra = Math.atan2(v[1], v[0]);
  const dec = Math.asin(v[2] / m);
  const m2 = m + normal() * inc.sigmaV;
  const ra2 = ra + normal() * inc.sigmaRaGrados * GRAD;
  const dec2 = dec + normal() * inc.sigmaDecGrados * GRAD;
  return [
    m2 * Math.cos(dec2) * Math.cos(ra2),
    m2 * Math.cos(dec2) * Math.sin(ra2),
    m2 * Math.sin(dec2),
  ];
}

export function montecarloBolido(
  reg: RegistroBolido,
  inc: IncertidumbreVelocidad,
  n: number,
  semilla: number,
  opciones: OpcionesOrbita = {},
): ResultadoOrbita[] {
  const { normal } = crearAzar(semilla);
  const clones: ResultadoOrbita[] = [];
  for (let k = 0; k < n; k++) {
    const vEcefKmS = perturbarVelocidad(reg.vEcefKmS, inc, normal);
    clones.push(orbitaDesdeBolido({ ...reg, vEcefKmS }, opciones));
  }
  return clones;
}
