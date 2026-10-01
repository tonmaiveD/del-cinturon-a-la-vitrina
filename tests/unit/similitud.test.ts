import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dDrummond, type ElementosAngulares } from '../../src/core/similitud';
import { GRAD } from '../../src/core/vector';
import { Calibracion } from '../../src/schema';

const cal = Calibracion.parse(
  JSON.parse(readFileSync('data/calibracion/pena-asensio-2025.json', 'utf8')),
);
type Fila = { a: number; e: number; i: number; omega: number; nodo: number; dd?: number };
const ang = (o: Fila): ElementosAngulares => ({
  q: o.a * (1 - o.e),
  e: o.e,
  i: o.i * GRAD,
  nodo: o.nodo * GRAD,
  omega: o.omega * GRAD,
});

describe('D_D de Drummond', () => {
  const A = ang({ a: 1.76, e: 0.581, i: 4.93, omega: 108.3, nodo: 326.44 });
  const B = ang({ a: 1.88, e: 0.609, i: 5.94, omega: 108.9, nodo: 326.45 });
  it('es cero para órbitas idénticas y simétrico', () => {
    expect(dDrummond(A, A)).toBeLessThan(1e-7);
    expect(dDrummond(A, B)).toBeCloseTo(dDrummond(B, A), 12);
  });
  it('reproduce los D_D publicados por Peña-Asensio et al. 2025 (Tabla 3) a partir de sus elementos redondeados', () => {
    for (const ev of cal.eventos) {
      const nuestro = dDrummond(ang(ev.ref), ang(ev.cneos_pena));
      const publicado = ev.ref.dd;
      // Los elementos de la tabla tienen 2 decimales: tolerancia absoluta por redondeo
      expect(Math.abs(nuestro - publicado), ev.nombre).toBeLessThan(0.015);
      if (publicado > 0.2) expect(Math.abs(nuestro / publicado - 1), ev.nombre).toBeLessThan(0.05);
    }
  });
});
