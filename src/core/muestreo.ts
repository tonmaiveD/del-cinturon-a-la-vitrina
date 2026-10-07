/**
 * Muestreo de órbitas publicadas con su σ (1σ) para dibujarlas como nube.
 * Supuesto (se declara en la UI): elementos gaussianos independientes, porque las fuentes no
 * publican la matriz de covarianza. Se descartan muestras no elípticas (e ≥ 1 o e < 0).
 */
import { crearAzar } from './azar';

export interface ElementosPublicados {
  a: { v: number; s?: number };
  e: { v: number; s?: number };
  i: { v: number; s?: number };
  nodo: { v: number; s?: number };
  omega: { v: number; s?: number };
}

/** Elementos en AU y grados (sin anomalía: solo la forma y orientación de la órbita). */
export interface FormaOrbita {
  a: number;
  e: number;
  i: number;
  nodo: number;
  omega: number;
}

/** Semilla estable derivada de un texto (FNV-1a de 32 bits). */
export function semillaDe(texto: string): number {
  let h = 0x811c9dc5;
  for (let k = 0; k < texto.length; k++) h = Math.imul(h ^ texto.charCodeAt(k), 0x01000193);
  return h >>> 0;
}

export function muestrearOrbita(o: ElementosPublicados, n: number, semilla: number): FormaOrbita[] {
  const azar = crearAzar(semilla);
  const g = (x: { v: number; s?: number }) => x.v + (x.s ?? 0) * azar.normal();
  const salida: FormaOrbita[] = [];
  for (let intentos = 0; salida.length < n && intentos < n * 20; intentos++) {
    const m = { a: g(o.a), e: g(o.e), i: g(o.i), nodo: g(o.nodo), omega: g(o.omega) };
    if (m.a > 0 && m.e >= 0 && m.e < 1) salida.push(m);
  }
  return salida;
}

/**
 * `n` puntos de la elipse (marco eclíptico, AU), equiespaciados en anomalía excéntrica
 * (más densos cerca del perihelio que un muestreo en tiempo, sin resolver Kepler).
 */
export function puntosForma(f: FormaOrbita, n: number): [number, number, number][] {
  const r = Math.PI / 180;
  const [cO, sO] = [Math.cos(f.nodo * r), Math.sin(f.nodo * r)];
  const [cw, sw] = [Math.cos(f.omega * r), Math.sin(f.omega * r)];
  const [ci, si] = [Math.cos(f.i * r), Math.sin(f.i * r)];
  const b = f.a * Math.sqrt(1 - f.e * f.e);
  return Array.from({ length: n }, (_, k) => {
    const E = (2 * Math.PI * k) / n;
    const X = f.a * (Math.cos(E) - f.e);
    const Y = b * Math.sin(E);
    return [
      (cO * cw - sO * sw * ci) * X + (-cO * sw - sO * cw * ci) * Y,
      (sO * cw + cO * sw * ci) * X + (-sO * sw + cO * cw * ci) * Y,
      sw * si * X + cw * si * Y,
    ];
  });
}

/**
 * Puntos de una cónica cualquiera (elipse o hipérbola) en el marco eclíptico (AU), por anomalía
 * verdadera. Para la hipérbola solo se dibuja la rama con r ≤ rMax (abierta: `cerrada` = false).
 */
export function puntosConica(
  f: FormaOrbita,
  n: number,
  rMax = 6,
): { puntos: [number, number, number][]; cerrada: boolean } {
  if (f.e < 1) return { puntos: puntosForma(f, n), cerrada: true };
  const r = Math.PI / 180;
  const p = f.a * (1 - f.e * f.e); // a < 0 y e > 1 → p > 0
  // r(ν) = p / (1 + e cos ν) ≤ rMax  ⇔  cos ν ≥ (p / rMax − 1) / e
  const nuMax = Math.acos(Math.max(-1, Math.min(1, (p / rMax - 1) / f.e)));
  const [cO, sO] = [Math.cos(f.nodo * r), Math.sin(f.nodo * r)];
  const [cw, sw] = [Math.cos(f.omega * r), Math.sin(f.omega * r)];
  const [ci, si] = [Math.cos(f.i * r), Math.sin(f.i * r)];
  const puntos = Array.from({ length: n }, (_, k): [number, number, number] => {
    const nu = -nuMax + (2 * nuMax * k) / (n - 1);
    const rad = p / (1 + f.e * Math.cos(nu));
    const X = rad * Math.cos(nu);
    const Y = rad * Math.sin(nu);
    return [
      (cO * cw - sO * sw * ci) * X + (-cO * sw - sO * cw * ci) * Y,
      (sO * cw + cO * sw * ci) * X + (-sO * sw + cO * cw * ci) * Y,
      sw * si * X + cw * si * Y,
    ];
  });
  return { puntos, cerrada: false };
}
