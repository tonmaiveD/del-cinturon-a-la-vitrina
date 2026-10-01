/**
 * Integrador Runge–Kutta adaptativo de Dormand–Prince 5(4) (DOPRI5).
 *
 * Coeficientes: Dormand, J. R. & Prince, P. J. (1980), "A family of embedded Runge-Kutta
 * formulae", J. Comput. Appl. Math. 6(1), 19–26. Su consistencia y el orden 5 se comprueban
 * en tests/unit/integrador.test.ts. Admite integración hacia atrás (t1 < t0).
 */
export type Derivada = (t: number, y: Float64Array, dy: Float64Array) => void;

export interface OpcionesIntegracion {
  /** Tolerancia relativa (por componente). */
  rtol?: number;
  /** Tolerancia absoluta (por componente). */
  atol?: number;
  /** Paso inicial (valor absoluto). */
  h0?: number;
  /** Paso máximo (valor absoluto). */
  hMax?: number;
  maxPasos?: number;
  /** Paso fijo sin control de error (solo para pruebas de orden). */
  pasoFijo?: number;
  /** Se llama tras cada paso aceptado; si devuelve true, la integración se detiene ahí. */
  alPaso?: (t: number, y: Float64Array) => boolean | void;
}

export interface ResultadoIntegracion {
  t: number;
  y: Float64Array;
  pasos: number;
  rechazos: number;
  detenido: boolean;
}

const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
/** Pesos de orden 5 (coinciden con la última fila de A: propiedad FSAL). */
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
/** Pesos del estimador embebido de orden 4. */
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

/** Tablero expuesto solo para verificación en tests. */
export const TABLERO_DOPRI5 = { C, A, B5, B4 } as const;

export function integrar(
  f: Derivada,
  t0: number,
  y0: ArrayLike<number>,
  t1: number,
  opciones: OpcionesIntegracion = {},
): ResultadoIntegracion {
  const { rtol = 1e-10, atol = 1e-12, maxPasos = 1_000_000, pasoFijo, alPaso } = opciones;
  const n = y0.length;
  const dir = t1 >= t0 ? 1 : -1;
  const hMax = opciones.hMax ?? Math.abs(t1 - t0);
  let h = dir * Math.min(pasoFijo ?? opciones.h0 ?? Math.abs(t1 - t0) / 100, hMax);

  let t = t0;
  let y = Float64Array.from(y0);
  const k = Array.from({ length: 7 }, () => new Float64Array(n));
  const yTmp = new Float64Array(n);
  const y5 = new Float64Array(n);
  f(t, y, k[0]!);

  let pasos = 0;
  let rechazos = 0;
  while (dir * (t1 - t) > 0) {
    if (pasos + rechazos >= maxPasos) throw new Error(`integrar: superado maxPasos (${maxPasos})`);
    if (dir * (t + h - t1) > 0) h = t1 - t;

    for (let s = 1; s < 7; s++) {
      const fila = A[s]!;
      for (let j = 0; j < n; j++) {
        let acc = y[j]!;
        for (let m = 0; m < s; m++) acc += h * fila[m]! * k[m]![j]!;
        yTmp[j] = acc;
      }
      if (s === 6) y5.set(yTmp);
      f(t + C[s]! * h, s === 6 ? y5 : yTmp, k[s]!);
    }

    let err = 0;
    if (pasoFijo === undefined) {
      for (let j = 0; j < n; j++) {
        let e = 0;
        for (let m = 0; m < 7; m++) e += (B5[m]! - B4[m]!) * k[m]![j]!;
        const sc = atol + rtol * Math.max(Math.abs(y[j]!), Math.abs(y5[j]!));
        err = Math.max(err, Math.abs(h * e) / sc);
      }
    }

    if (err <= 1) {
      t += h;
      y = Float64Array.from(y5);
      k[0]!.set(k[6]!); // FSAL
      pasos++;
      if (alPaso?.(t, y)) return { t, y, pasos, rechazos, detenido: true };
    } else {
      rechazos++;
    }
    if (pasoFijo === undefined) {
      const factor = err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * err ** -0.2));
      h = dir * Math.min(Math.abs(h * factor), hMax);
    }
  }
  return { t, y, pasos, rechazos, detenido: false };
}
