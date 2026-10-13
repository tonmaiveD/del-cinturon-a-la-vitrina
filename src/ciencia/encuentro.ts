/**
 * Encuentro con la Tierra en la aproximación de dos cuerpos. Una órbita pre-atmosférica se
 * describe sin la atracción terrestre; el objeto choca si su parámetro de impacto b (la distancia
 * a la que su trayectoria relativa, recta, pasaría del centro de la Tierra) no supera el radio de
 * captura r·√(1 + v_esc²/v_g²), que amplía el radio de choque por el enfoque gravitatorio.
 * Es una aproximación: no simula el encuentro ni el paso por la atmósfera.
 *
 * Está fuera de src/core a propósito: la huella del método del CNEOS (pipeline/huella-metodo.ts)
 * se calcula con los archivos de src/core, y estas funciones no intervienen en esas órbitas.
 */
import type { Vec3 } from '../core/vector';

/** GM terrestre (km³/s², IAU). */
export const GM_TIERRA_KM3_S2 = 398600.4418;
/** Radio medio de la Tierra (km). */
export const RADIO_TIERRA_KM = 6371;
/** Altura de atmósfera que se suma al radio de choque (km). Es un parámetro, no una constante. */
export const ALTURA_ATMOSFERA_KM = 100;

/** Radio de captura (km) para una velocidad geocéntrica v_g (km/s) y un radio de choque r (km). */
export function radioCaptura(vgKmS: number, rKm = RADIO_TIERRA_KM + ALTURA_ATMOSFERA_KM): number {
  const vEsc2 = (2 * GM_TIERRA_KM3_S2) / rKm;
  return rKm * Math.sqrt(1 + vEsc2 / (vgKmS * vgKmS));
}

/**
 * Parámetro de impacto: distancia mínima al origen de la recta r + v·t (en la unidad de r).
 * Con r y v relativos a la Tierra, es la distancia a la que pasaría sin su atracción.
 */
export function parametroImpacto(r: Vec3, v: Vec3): number {
  const c: Vec3 = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  return Math.hypot(...c) / Math.hypot(...v);
}

/** Instante de máxima aproximación de esa recta, medido desde t = 0 (en la unidad de tiempo de v). */
export function instanteMaximaAproximacion(r: Vec3, v: Vec3): number {
  return -(r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) / (v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}
