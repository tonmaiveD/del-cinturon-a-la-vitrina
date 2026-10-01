/**
 * Problema de dos cuerpos: ecuación de Kepler y conversión estado ↔ elementos.
 *
 * Unidades internas: longitudes y tiempos coherentes con `mu` (en el proyecto, AU y días,
 * con mu en AU³/día²). Ángulos en radianes.
 * Casos degenerados: si la órbita es casi ecuatorial se toma Ω = 0; si es casi circular,
 * ω = 0 y la anomalía se mide desde el nodo (o desde el eje x si además es ecuatorial).
 * Las órbitas casi parabólicas (|e − 1| < 1e-9) no están soportadas.
 */
import { angulo0a2pi, cruz, escala, norma, punto, resta, type Vec3 } from './vector';

export interface Elementos {
  /** Semieje mayor; negativo en órbitas hiperbólicas. */
  a: number;
  e: number;
  i: number;
  /** Longitud del nodo ascendente Ω. */
  nodo: number;
  /** Argumento del pericentro ω. */
  omega: number;
  /** Anomalía media en la época (hiperbólica si e > 1). */
  M: number;
  /** Época, en las unidades de tiempo de `mu`. */
  epoca: number;
}

export interface Estado {
  r: Vec3;
  v: Vec3;
}

const TOL_DEGENERADO = 1e-11;
const TOL_PARABOLICO = 1e-9;

/** Resuelve M = E − e·sen E (elíptica, 0 ≤ e < 1). Devuelve E en rad. */
export function resolverKeplerEliptico(M: number, e: number): number {
  if (e < 0 || e >= 1) throw new RangeError(`excentricidad elíptica fuera de rango: ${e}`);
  const m = angulo0a2pi(M);
  let E = e < 0.8 ? m : Math.PI; // arranque estándar robusto para e alta
  for (let k = 0; k < 50; k++) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    const fpp = e * Math.sin(E);
    // Halley: convergencia cúbica y estable en todo el rango
    const dE = -f / (fp - (0.5 * f * fpp) / fp);
    E += dE;
    if (Math.abs(dE) < 1e-15) break;
  }
  return E + (M - m);
}

/** Resuelve M = e·senh H − H (hiperbólica, e > 1). Devuelve H. */
export function resolverKeplerHiperbolico(M: number, e: number): number {
  if (e <= 1) throw new RangeError(`excentricidad hiperbólica fuera de rango: ${e}`);
  let H = Math.asinh(M / e); // arranque que acota bien para |M| grande y pequeño
  for (let k = 0; k < 100; k++) {
    const f = e * Math.sinh(H) - H - M;
    const fp = e * Math.cosh(H) - 1;
    const fpp = e * Math.sinh(H);
    const dH = -f / (fp - (0.5 * f * fpp) / fp);
    H += dH;
    if (Math.abs(dH) < 1e-15 * Math.max(1, Math.abs(H))) break;
  }
  return H;
}

/** Anomalía verdadera ν a partir de la anomalía media. */
export function anomaliaVerdadera(M: number, e: number): number {
  if (e < 1) {
    const E = resolverKeplerEliptico(M, e);
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }
  const H = resolverKeplerHiperbolico(M, e);
  return 2 * Math.atan2(Math.sqrt(e + 1) * Math.sinh(H / 2), Math.sqrt(e - 1) * Math.cosh(H / 2));
}

/** Anomalía media a partir de la anomalía verdadera. */
export function anomaliaMedia(nu: number, e: number): number {
  if (e < 1) {
    const E =
      2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
    return E - e * Math.sin(E);
  }
  const H = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
  return e * Math.sinh(H) - H;
}

/** Movimiento medio n = √(mu/|a|³). */
export const movimientoMedio = (a: number, mu: number): number => Math.sqrt(mu / Math.abs(a) ** 3);

/** Elementos osculadores a partir de posición y velocidad en la época `epoca`. */
export function elementosDesdeEstado({ r, v }: Estado, mu: number, epoca: number): Elementos {
  const rn = norma(r);
  const h = cruz(r, v);
  const hn = norma(h);
  const n: Vec3 = [-h[1], h[0], 0]; // ẑ × h, línea de nodos
  const nn = norma(n);
  const eVec = resta(escala(cruz(v, h), 1 / mu), escala(r, 1 / rn));
  const e = norma(eVec);
  if (Math.abs(e - 1) < TOL_PARABOLICO) throw new RangeError('órbita casi parabólica no soportada');

  const energia = punto(v, v) / 2 - mu / rn;
  const a = -mu / (2 * energia);
  const i = Math.acos(Math.min(1, Math.max(-1, h[2] / hn)));

  const ecuatorial = nn / hn < TOL_DEGENERADO;
  const circular = e < TOL_DEGENERADO;
  const nodo = ecuatorial ? 0 : angulo0a2pi(Math.atan2(n[1], n[0]));

  // Dirección de referencia en el plano orbital para medir ω y ν
  const refNodo: Vec3 = ecuatorial ? [1, 0, 0] : escala(n, 1 / nn);
  const perpNodo = escala(cruz(h, refNodo), 1 / hn); // ⟂ en el plano, sentido del movimiento

  let omega = 0;
  let nu: number;
  if (circular) {
    nu = Math.atan2(punto(r, perpNodo), punto(r, refNodo));
  } else {
    omega = angulo0a2pi(Math.atan2(punto(eVec, perpNodo), punto(eVec, refNodo)));
    const eUnit = escala(eVec, 1 / e);
    const eperp = escala(cruz(h, eUnit), 1 / hn);
    nu = Math.atan2(punto(r, eperp), punto(r, eUnit));
  }
  const M = anomaliaMedia(nu, e);
  return { a, e, i, nodo, omega, M: e < 1 ? angulo0a2pi(M) : M, epoca };
}

/** Posición y velocidad a partir de elementos, en el instante `t`. */
export function estadoDesdeElementos(el: Elementos, mu: number, t: number = el.epoca): Estado {
  const { a, e, i, nodo, omega } = el;
  const M = el.M + movimientoMedio(a, mu) * (t - el.epoca);
  const nu = anomaliaVerdadera(M, e);
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const rp: Vec3 = [r * Math.cos(nu), r * Math.sin(nu), 0];
  const k = Math.sqrt(mu / p);
  const vp: Vec3 = [-k * Math.sin(nu), k * (e + Math.cos(nu)), 0];

  const [cO, sO, cw, sw, ci, si] = [
    Math.cos(nodo),
    Math.sin(nodo),
    Math.cos(omega),
    Math.sin(omega),
    Math.cos(i),
    Math.sin(i),
  ];
  // Matriz perifocal → inercial: Rz(Ω)·Rx(i)·Rz(ω)
  const P: Vec3 = [cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si];
  const Q: Vec3 = [-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si];
  const rotar = (x: Vec3): Vec3 => [
    P[0] * x[0] + Q[0] * x[1],
    P[1] * x[0] + Q[1] * x[1],
    P[2] * x[0] + Q[2] * x[1],
  ];
  return { r: rotar(rp), v: rotar(vp) };
}

/** Distancia al pericentro q = a(1 − e). */
export const perihelio = (el: Pick<Elementos, 'a' | 'e'>): number => el.a * (1 - el.e);
