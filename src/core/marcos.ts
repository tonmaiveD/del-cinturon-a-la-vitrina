/**
 * Conversiones entre marcos de referencia.
 *
 * - EQJ: ecuador y equinoccio medios J2000 (marco nativo de astronomy-engine).
 * - ECL: eclíptica y equinoccio medios J2000 (marco de los elementos orbitales publicados).
 * - EQD: ecuador y equinoccio verdaderos de la fecha.
 * - ECEF: fijo a la Tierra. Se aproxima como EQD rotado por el tiempo sidéreo aparente de
 *   Greenwich (GAST), sin movimiento del polo (error de orden 10 m en superficie).
 *
 * Tiempos: AstroTime de astronomy-engine (UT ≈ UTC). Posiciones en AU; velocidades en AU/día.
 */
import * as Astro from 'astronomy-engine';
import { aplicar, rotacionZ, type Mat3, type Vec3 } from './vector';

export const KM_POR_AU = Astro.KM_PER_AU;
export const SEGUNDOS_POR_DIA = 86400;
/** km/s → AU/día */
export const KMS_A_AUD = SEGUNDOS_POR_DIA / KM_POR_AU;

const mat = (r: Astro.RotationMatrix): Mat3 => r.rot.map((fila) => [...fila]) as Mat3;
/** astronomy-engine guarda las matrices por columnas: rot[i][j] es la columna i, fila j. */
const traspuesta = (m: Mat3): Mat3 => [
  [m[0][0], m[1][0], m[2][0]],
  [m[0][1], m[1][1], m[2][1]],
  [m[0][2], m[1][2], m[2][2]],
];
const deAstro = (r: Astro.RotationMatrix): Mat3 => traspuesta(mat(r));

const M_EQJ_ECL = deAstro(Astro.Rotation_EQJ_ECL());
const M_ECL_EQJ = deAstro(Astro.Rotation_ECL_EQJ());

export const eqjAEcl = (v: Vec3): Vec3 => aplicar(M_EQJ_ECL, v);
export const eclAEqj = (v: Vec3): Vec3 => aplicar(M_ECL_EQJ, v);

/** GAST en radianes. */
export const tiempoSidereo = (t: Astro.AstroTime): number =>
  (Astro.SiderealTime(t) * 15 * Math.PI) / 180;

/** Rota un vector expresado en ECEF a EQJ (sin añadir velocidad de arrastre). */
export function ecefAEqj(v: Vec3, t: Astro.AstroTime): Vec3 {
  const eqd = aplicar(rotacionZ(tiempoSidereo(t)), v);
  return aplicar(deAstro(Astro.Rotation_EQD_EQJ(t)), eqd);
}

/** Rota un vector expresado en EQJ a ECEF. */
export function eqjAEcef(v: Vec3, t: Astro.AstroTime): Vec3 {
  const eqd = aplicar(deAstro(Astro.Rotation_EQJ_EQD(t)), v);
  return aplicar(rotacionZ(-tiempoSidereo(t)), eqd);
}

/**
 * Estado geocéntrico EQJ de un punto fijo a la Tierra (lat, lon geodésicas en grados, altura
 * en m). La velocidad es la de arrastre por rotación terrestre (ω × r).
 * astronomy-engine documenta validez para alturas de 0 a 100 km.
 */
export function estadoPuntoTerrestre(
  latGrados: number,
  lonGrados: number,
  alturaM: number,
  t: Astro.AstroTime,
): { r: Vec3; v: Vec3 } {
  const s = Astro.ObserverState(t, new Astro.Observer(latGrados, lonGrados, alturaM), false);
  return { r: [s.x, s.y, s.z], v: [s.vx, s.vy, s.vz] };
}
