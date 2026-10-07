/**
 * Trayectoria de entrada de un bólido en ECEF (km): desde ALTURA_INICIO_KM (referencia visual)
 * hasta el pico de brillo, en sentido contrario al vector de velocidad publicado.
 */
import * as Astro from 'astronomy-engine';
import { Vector3 } from 'three';
import { eqjAEcef, estadoPuntoTerrestre, KM_POR_AU } from '../core/marcos';
import { escala, norma, punto, suma, unitario, type Vec3 } from '../core/vector';
import { RADIO_TIERRA_KM } from './cuerpos';

/** Altura de inicio dibujada para la trayectoria de entrada (km): solo referencia visual. */
export const ALTURA_INICIO_KM = 100;

export function trayectoriaEntradaEcefKm(
  latGrados: number,
  lonGrados: number,
  alturaKm: number,
  vEcefKmS: Vec3,
  t: Astro.AstroTime = Astro.MakeTime(new Date('2000-01-01T12:00:00Z')),
): { inicio: Vec3; pico: Vec3 } {
  const p = estadoPuntoTerrestre(latGrados, lonGrados, alturaKm * 1000, t);
  const pico = escala(eqjAEcef(p.r, t), KM_POR_AU);
  const subida = unitario(escala(vEcefKmS, -1));
  // Distancia s a lo largo de la subida hasta ALTURA_INICIO_KM sobre el radio local
  const objetivo = norma(pico) - alturaKm + ALTURA_INICIO_KM;
  const b = punto(pico, subida);
  const s = -b + Math.sqrt(b * b - (punto(pico, pico) - objetivo * objetivo));
  return { inicio: suma(pico, escala(subida, s)), pico };
}

/** ECEF (km) → ejes locales del globo de Three (radios terrestres). */
export const localGlobo = (v: Vec3) =>
  new Vector3(v[0] / RADIO_TIERRA_KM, v[2] / RADIO_TIERRA_KM, -v[1] / RADIO_TIERRA_KM);
