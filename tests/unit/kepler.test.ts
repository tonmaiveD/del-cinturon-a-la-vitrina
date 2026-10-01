import { describe, expect, it } from 'vitest';
import {
  anomaliaMedia,
  anomaliaVerdadera,
  elementosDesdeEstado,
  estadoDesdeElementos,
  resolverKeplerEliptico,
  resolverKeplerHiperbolico,
  type Elementos,
} from '../../src/core/kepler';
import { GRAD, norma, resta, type Vec3 } from '../../src/core/vector';

/** Generador pseudoaleatorio determinista (mulberry32). */
function azar(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const difAngular = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('ecuación de Kepler', () => {
  it('elíptica: residuo < 1e-14 en una malla de e y M (incluida e = 0.999)', () => {
    for (const e of [0, 0.1, 0.5, 0.8, 0.9, 0.99, 0.999]) {
      for (let k = 0; k <= 72; k++) {
        const M = (k * 5 - 180) * GRAD;
        const E = resolverKeplerEliptico(M, e);
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-14);
      }
    }
  });

  it('hiperbólica: residuo relativo < 1e-13 para |M| hasta 1e4', () => {
    for (const e of [1.001, 1.1, 2, 10]) {
      for (const M of [-1e4, -50, -1, -1e-3, 0, 1e-3, 1, 50, 1e4]) {
        const H = resolverKeplerHiperbolico(M, e);
        expect(Math.abs(e * Math.sinh(H) - H - M)).toBeLessThan(1e-13 * Math.max(1, Math.abs(M)));
      }
    }
  });

  it('anomalía media ↔ verdadera es reversible', () => {
    for (const e of [0, 0.3, 0.95, 1.5, 4]) {
      const lim = e < 1 ? Math.PI : Math.acos(-1 / e) - 1e-3;
      for (let k = -10; k <= 10; k++) {
        const nu = (k / 10) * lim * 0.999;
        expect(difAngular(anomaliaVerdadera(anomaliaMedia(nu, e), e), nu)).toBeLessThan(1e-11);
      }
    }
  });
});

describe('estado ↔ elementos: casos analíticos (mu = 1)', () => {
  const casos: { nombre: string; r: Vec3; v: Vec3; esperado: Partial<Elementos> }[] = [
    {
      nombre: 'circular ecuatorial prógrada',
      r: [1, 0, 0],
      v: [0, 1, 0],
      esperado: { a: 1, e: 0, i: 0 },
    },
    {
      nombre: 'circular ecuatorial retrógrada',
      r: [1, 0, 0],
      v: [0, -1, 0],
      esperado: { a: 1, e: 0, i: Math.PI },
    },
    {
      nombre: 'circular polar',
      r: [1, 0, 0],
      v: [0, 0, 1],
      esperado: { a: 1, e: 0, i: Math.PI / 2, nodo: 0 },
    },
    {
      nombre: 'elíptica en el pericentro (q = 0.5, e = 0.6)',
      r: [0.5, 0, 0],
      v: [0, Math.sqrt(1.6 / 0.5), 0],
      esperado: { a: 0.5 / 0.4, e: 0.6, i: 0, omega: 0, M: 0 },
    },
    {
      nombre: 'hiperbólica en el pericentro (q = 1, e = 2)',
      r: [1, 0, 0],
      v: [0, Math.sqrt(3), 0],
      esperado: { a: -1, e: 2, i: 0, omega: 0, M: 0 },
    },
  ];
  for (const { nombre, r, v, esperado } of casos) {
    it(nombre, () => {
      const el = elementosDesdeEstado({ r, v }, 1, 0);
      for (const [k, val] of Object.entries(esperado)) {
        expect(el[k as keyof Elementos], k).toBeCloseTo(val as number, 12);
      }
    });
  }

  it('el nodo ascendente se ubica donde la órbita cruza z = 0 subiendo', () => {
    // Órbita circular inclinada 30° con nodo a 90°: en (0,1,0) la velocidad apunta hacia −x y +z
    const i = 30 * GRAD;
    const el = elementosDesdeEstado({ r: [0, 1, 0], v: [-Math.cos(i), 0, Math.sin(i)] }, 1, 0);
    expect(el.nodo).toBeCloseTo(Math.PI / 2, 12);
    expect(el.i).toBeCloseTo(i, 12);
  });
});

describe('estado ↔ elementos: ida y vuelta aleatoria', () => {
  it('1000 órbitas elípticas e hiperbólicas reconstruyen el estado con error relativo < 1e-10', () => {
    const r = azar(42);
    const mu = 2.959122082855911e-4; // GM solar en AU³/día² (solo escala numérica del test)
    for (let n = 0; n < 1000; n++) {
      const hiper = n % 4 === 0;
      const e = hiper ? 1.01 + 3 * r() : 0.98 * r();
      const q = 0.1 + 3 * r();
      const el: Elementos = {
        a: q / (1 - e),
        e,
        i: Math.PI * r(),
        nodo: 2 * Math.PI * r(),
        omega: 2 * Math.PI * r(),
        M: hiper ? 4 * (r() - 0.5) : 2 * Math.PI * r(),
        epoca: 0,
      };
      const s = estadoDesdeElementos(el, mu);
      const s2 = estadoDesdeElementos(elementosDesdeEstado(s, mu, 0), mu);
      expect(norma(resta(s.r, s2.r)) / norma(s.r)).toBeLessThan(1e-10);
      expect(norma(resta(s.v, s2.v)) / norma(s.v)).toBeLessThan(1e-10);
    }
  });

  it('la propagación kepleriana conserva energía y momento angular', () => {
    const mu = 1;
    const el: Elementos = { a: 2, e: 0.7, i: 0.4, nodo: 1, omega: 2, M: 0, epoca: 0 };
    const h0 = elementosDesdeEstado(estadoDesdeElementos(el, mu, 0), mu, 0);
    for (const t of [1, 10, 123.4, 1e4]) {
      const el2 = elementosDesdeEstado(estadoDesdeElementos(el, mu, t), mu, t);
      expect(el2.a).toBeCloseTo(h0.a, 10);
      expect(el2.e).toBeCloseTo(h0.e, 10);
      expect(el2.i).toBeCloseTo(h0.i, 10);
    }
  });
});
