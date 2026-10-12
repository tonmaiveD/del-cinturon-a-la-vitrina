/**
 * Monte Carlo de la órbita de un bólido a partir de sus errores típicos.
 *
 * Peña-Asensio et al. (2025, Tabla 4) miden los errores del CNEOS sobre el radiante
 * geocéntrico (α_g, δ_g) y sobre la velocidad. Por eso cada clon se construye así:
 * 1. del vector publicado se obtiene el radiante geocéntrico y la velocidad de entrada
 *    (atracción cenital analítica, en el pico de brillo);
 * 2. se perturban α_g y δ_g (en grados de AR y de declinación, como los publica la tabla) y el
 *    módulo de la velocidad de entrada;
 * 3. se reconstruye el estado en el mismo punto con la inversa de la atracción cenital y se
 *    integra con N cuerpos, igual que la órbita nominal.
 * Sin perturbación, el clon reproduce la órbita nominal (prueba en orbita-bolido.test.ts).
 *
 * Hasta el 2026-10-12 se perturbaba la dirección del vector aparente en ejes ECEF con esas
 * mismas σ, una aproximación no declarada que señaló la auditoría externa (M09).
 */
import * as Astro from 'astronomy-engine';
import { crearAzar } from './azar';
import { gm } from './dinamica';
import { KMS_A_AUD } from './marcos';
import {
  elementosSinTierra,
  estadoDesdeRadianteGeocentrico,
  estadoGeocentrico,
  orbitaAtraccionCenital,
  type EntradaRadiante,
  type OpcionesOrbita,
  type RegistroBolido,
  type ResultadoOrbita,
} from './orbita-bolido';
import { norma } from './vector';

export interface IncertidumbreVelocidad {
  /** σ del módulo de la velocidad de entrada (km/s). */
  sigmaV: number;
  /** σ de la ascensión recta del radiante geocéntrico (grados de AR). */
  sigmaRaGrados: number;
  /** σ de la declinación del radiante geocéntrico (grados). */
  sigmaDecGrados: number;
}

/**
 * Radiante geocéntrico perturbado de un registro, listo para reconstruir su estado. Lanza un
 * error si la velocidad perturbada no supera la de escape (no hay órbita posible).
 */
export function radiantePerturbado(
  reg: RegistroBolido,
  inc: IncertidumbreVelocidad,
  normal: () => number,
  hipotesis: OpcionesOrbita['hipotesis'] = 'ecef-relativa',
): EntradaRadiante {
  const { r, v } = estadoGeocentrico(reg, hipotesis);
  const { radiante } = orbitaAtraccionCenital(reg, hipotesis);
  // Velocidad de entrada (km/s) perturbada → v_g con la misma corrección de energía
  const vEntrada = norma(v) / KMS_A_AUD + normal() * inc.sigmaV;
  const vEscape2 = (2 * gm('Earth')) / norma(r) / (KMS_A_AUD * KMS_A_AUD);
  const vg2 = vEntrada * vEntrada - vEscape2;
  if (!(vg2 > 0)) throw new Error('velocidad perturbada por debajo de la de escape');
  return {
    fecha: reg.fecha,
    latGrados: reg.latGrados,
    lonGrados: reg.lonGrados,
    alturaKm: reg.alturaKm,
    raGrados: radiante.ra + normal() * inc.sigmaRaGrados,
    decGrados: radiante.dec + normal() * inc.sigmaDecGrados,
    vgKmS: Math.sqrt(vg2),
  };
}

/** Órbita (sin la deflexión terrestre) de un radiante geocéntrico, como la nominal. */
export function orbitaDeRadiante(
  entrada: EntradaRadiante,
  opciones: OpcionesOrbita = {},
): ResultadoOrbita {
  const { t, y0 } = estadoDesdeRadianteGeocentrico(entrada);
  const { elementos, tSalida } = elementosSinTierra(
    y0,
    t.ut,
    t.ut,
    opciones.distanciaSalida,
    opciones.rtol,
  );
  const tierra = Astro.HelioState(Astro.Body.Earth, t);
  const vGeo = Math.hypot(y0[3]! - tierra.vx, y0[4]! - tierra.vy, y0[5]! - tierra.vz);
  return {
    elementos,
    radiante: { ra: entrada.raGrados, dec: entrada.decGrados, vg: entrada.vgKmS },
    vInercialKmS: vGeo / KMS_A_AUD,
    diasRetro: t.ut - tSalida,
  };
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
  for (let k = 0; k < n; k++)
    clones.push(
      orbitaDeRadiante(radiantePerturbado(reg, inc, normal, opciones.hipotesis), opciones),
    );
  return clones;
}

/** Valor publicado con su σ (1σ), en las unidades de `EntradaRadiante`. */
export interface ConSigma {
  v: number;
  s: number;
}

/**
 * Nube de órbitas de una caída con radiante publicado: se sortean α_g, δ_g y v_g (normales
 * independientes con su σ a 1σ) y cada clon se integra igual que la órbita nominal, de modo
 * que todos pasan por la Tierra en el instante de referencia. Se descartan los clones sin
 * órbita elíptica (e ≥ 1 o sin solución) y se devuelve cuántos.
 */
export function nubeDesdeRadiante(
  base: Omit<EntradaRadiante, 'raGrados' | 'decGrados' | 'vgKmS'>,
  radiante: { ra: ConSigma; dec: ConSigma; vg: ConSigma },
  n: number,
  semilla: number,
  opciones: OpcionesOrbita = {},
): { clones: ResultadoOrbita[]; descartados: number } {
  const { normal } = crearAzar(semilla);
  const clones: ResultadoOrbita[] = [];
  let descartados = 0;
  while (clones.length < n && descartados < n) {
    const entrada: EntradaRadiante = {
      ...base,
      raGrados: radiante.ra.v + normal() * radiante.ra.s,
      decGrados: radiante.dec.v + normal() * radiante.dec.s,
      vgKmS: radiante.vg.v + normal() * radiante.vg.s,
    };
    try {
      const r = orbitaDeRadiante(entrada, opciones);
      if (r.elementos.e < 1 && r.elementos.a > 0) clones.push(r);
      else descartados++;
    } catch {
      descartados++;
    }
  }
  return { clones, descartados };
}
