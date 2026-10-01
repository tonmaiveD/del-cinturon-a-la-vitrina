/**
 * Radios físicos para la escala real.
 * - Tierra y Sol: constantes internas de astronomy-engine v2.1.19 (EARTH_EQUATORIAL_RADIUS_KM,
 *   SUN_RADIUS_KM), fuente "astronomy-engine".
 * - Planetas: diámetro ecuatorial / 2 de la NASA Planetary Fact Sheet, fuente
 *   "nasa-planetary-fact-sheet" (consultada 2026-10-01).
 */
export const RADIO_TIERRA_KM = 6378.1366;
export const RADIO_SOL_KM = 695700;

export interface Planeta {
  cuerpo: 'Mercury' | 'Venus' | 'Earth' | 'Mars' | 'Jupiter';
  clave: 'mercurio' | 'venus' | 'tierra' | 'marte' | 'jupiter';
  radioKm: number;
  /** Periodo aproximado solo para muestrear la línea de la órbita (días). */
  periodoMuestreo: number;
  color: number;
}

export const PLANETAS: Planeta[] = [
  { cuerpo: 'Mercury', clave: 'mercurio', radioKm: 4879 / 2, periodoMuestreo: 88, color: 0xb5a89a },
  { cuerpo: 'Venus', clave: 'venus', radioKm: 12104 / 2, periodoMuestreo: 225, color: 0xe8cf9a },
  { cuerpo: 'Earth', clave: 'tierra', radioKm: 12756 / 2, periodoMuestreo: 366, color: 0x6fa8ff },
  { cuerpo: 'Mars', clave: 'marte', radioKm: 6792 / 2, periodoMuestreo: 687, color: 0xd9734a },
  {
    cuerpo: 'Jupiter',
    clave: 'jupiter',
    radioKm: 142984 / 2,
    periodoMuestreo: 4333,
    color: 0xd8b48a,
  },
];
