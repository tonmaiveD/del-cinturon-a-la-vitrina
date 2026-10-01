import { describe, expect, it } from 'vitest';
import { derivadaDosCuerpos } from '../../src/core/dinamica';
import { integrar, TABLERO_DOPRI5 } from '../../src/core/integrador';
import { elementosDesdeEstado, estadoDesdeElementos, type Elementos } from '../../src/core/kepler';
import { norma, resta, type Vec3 } from '../../src/core/vector';

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('tablero de Dormand–Prince 5(4)', () => {
  const { A, B4, B5, C } = TABLERO_DOPRI5;
  it('cada fila de A suma su nodo c', () => {
    A.forEach((fila, s) => expect(suma(fila as number[])).toBeCloseTo(C[s]!, 14));
  });
  it('los pesos de orden 5 y 4 suman 1', () => {
    expect(suma(B5)).toBeCloseTo(1, 14);
    expect(suma(B4)).toBeCloseTo(1, 14);
  });
  it('condiciones de orden de los pesos de 5º orden: Σb·c^k = 1/(k+1), k ≤ 4', () => {
    for (let k = 1; k <= 4; k++) {
      expect(suma(B5.map((b, s) => b * C[s]! ** k))).toBeCloseTo(1 / (k + 1), 14);
    }
  });
});

describe('integrador', () => {
  // Oscilador armónico y'' = −y: solución exacta cos t
  const oscilador = (_t: number, y: Float64Array, dy: Float64Array) => {
    dy[0] = y[1]!;
    dy[1] = -y[0]!;
  };

  it('converge con orden 5 a paso fijo', () => {
    // y' = −2t·y², y(0) = 1 → y(t) = 1/(1 + t²); no lineal y no autónoma
    const f = (t: number, y: Float64Array, dy: Float64Array) => {
      dy[0] = -2 * t * y[0]! ** 2;
    };
    const error = (n: number) => Math.abs(integrar(f, 0, [1], 1, { pasoFijo: 1 / n }).y[0]! - 0.5);
    for (const n of [16, 32]) {
      const orden = Math.log2(error(n) / error(2 * n));
      expect(orden).toBeGreaterThan(4.9);
      expect(orden).toBeLessThan(5.3);
    }
  });

  it('integra hacia atrás y vuelve al estado inicial', () => {
    const ida = integrar(oscilador, 0, [1, 0], 10);
    const vuelta = integrar(oscilador, 10, ida.y, 0);
    expect(vuelta.t).toBe(0);
    expect(Math.abs(vuelta.y[0]! - 1)).toBeLessThan(1e-9);
  });

  it('se detiene cuando lo pide alPaso', () => {
    const r = integrar(oscilador, 0, [1, 0], 10, { alPaso: (_t, y) => y[0]! < 0 });
    expect(r.detenido).toBe(true);
    expect(r.t).toBeGreaterThan(Math.PI / 2 - 0.5);
    expect(r.t).toBeLessThan(Math.PI / 2 + 0.5);
  });

  it('dos cuerpos: coincide con Kepler y conserva la energía en 100 órbitas de e = 0.6', () => {
    const mu = 1;
    const el: Elementos = { a: 1, e: 0.6, i: 0.3, nodo: 0.5, omega: 1.2, M: 0, epoca: 0 };
    const s0 = estadoDesdeElementos(el, mu);
    const T = 2 * Math.PI * 100;
    const res = integrar(derivadaDosCuerpos(mu), 0, [...s0.r, ...s0.v], T, {
      rtol: 1e-12,
      atol: 1e-14,
    });
    const r: Vec3 = [res.y[0]!, res.y[1]!, res.y[2]!];
    const v: Vec3 = [res.y[3]!, res.y[4]!, res.y[5]!];
    const kep = estadoDesdeElementos(el, mu, T);
    expect(norma(resta(r, kep.r))).toBeLessThan(1e-7);
    const energia = (rr: Vec3, vv: Vec3) => norma(vv) ** 2 / 2 - mu / norma(rr);
    const deriva = Math.abs(energia(r, v) / energia(s0.r, s0.v) - 1);
    expect(deriva).toBeLessThan(1e-10);
    expect(elementosDesdeEstado({ r, v }, mu, T).e).toBeCloseTo(0.6, 9);
  });
});
