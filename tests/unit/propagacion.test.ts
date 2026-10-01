/**
 * Propagación contra astronomy-engine.
 *
 * 1) Dinámica + integrador frente a `GravitySimulator` de astronomy-engine con la misma física
 *    (Sol + 8 planetas, Tierra+Luna como una masa). Es la validación fuerte.
 * 2) Kepler y N-cuerpos frente a las efemérides de planetas (VSOP87 truncado). Medido en
 *    2026-10: los estados de astronomy-engine no son dinámicamente autoconsistentes a nivel de
 *    ~10³ km en 30 días (Kepler y N-cuerpos discrepan por igual), así que las tolerancias aquí
 *    acotan la precisión de la referencia, no la de nuestro código.
 */
import * as Astro from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import {
  derivadaHeliocentrica,
  gm,
  PERTURBADORES_ENCUENTRO,
  PERTURBADORES_GRAVSIM,
} from '../../src/core/dinamica';
import { integrar } from '../../src/core/integrador';
import { elementosDesdeEstado, estadoDesdeElementos } from '../../src/core/kepler';
import { KM_POR_AU } from '../../src/core/marcos';

const t0 = Astro.MakeTime(new Date('2013-01-01T00:00:00Z'));
const distKm = (a: ArrayLike<number>, b: { x: number; y: number; z: number }) =>
  Math.hypot(a[0]! - b.x, a[1]! - b.y, a[2]! - b.z) * KM_POR_AU;

describe('dinámica N-cuerpos vs GravitySimulator de astronomy-engine', () => {
  // Órbita sintética tipo Apolo (solo para el test numérico, no es un dato de ningún objeto real)
  const s = estadoDesdeElementos(
    { a: 1.7, e: 0.55, i: 0.12, nodo: 5.7, omega: 1.9, M: 4.0, epoca: 0 },
    gm('Sun'),
    0,
  );

  for (const [dias, tolKm] of [
    [1, 0.1],
    [16, 1],
    [64, 5],
  ] as const) {
    it(`${dias} días: diferencia < ${tolKm} km`, () => {
      const sim = new Astro.GravitySimulator(Astro.Body.Sun, t0, [
        new Astro.StateVector(...s.r, ...s.v, t0),
      ]);
      let g: Astro.StateVector[] = [];
      for (let k = 1; k <= dias * 40; k++) g = sim.Update(t0.AddDays(k / 40));
      const r = integrar(
        derivadaHeliocentrica(PERTURBADORES_GRAVSIM),
        t0.ut,
        [...s.r, ...s.v],
        t0.ut + dias,
        {
          rtol: 1e-13,
          atol: 1e-15,
        },
      );
      expect(distKm(r.y, g[0]!)).toBeLessThan(tolKm);
    });
  }
});

describe('propagación de planetas vs efemérides de astronomy-engine', () => {
  const casos = [
    { cuerpo: 'EMB', excluir: ['Earth', 'Moon'] },
    { cuerpo: 'Mars', excluir: ['Mars'] },
    { cuerpo: 'Venus', excluir: ['Venus'] },
  ] as const;

  for (const { cuerpo, excluir } of casos) {
    it(`${cuerpo}: Kepler y N-cuerpos dentro de 50 km a 1 día y 5000 km a 30 días`, () => {
      const s = Astro.HelioState(cuerpo as Astro.Body, t0);
      const mu = gm('Sun') + gm(cuerpo);
      const el = elementosDesdeEstado({ r: [s.x, s.y, s.z], v: [s.vx, s.vy, s.vz] }, mu, t0.ut);
      const pert = PERTURBADORES_ENCUENTRO.filter(
        (p) => !(excluir as readonly string[]).includes(p.cuerpo),
      );
      for (const [dt, tol] of [
        [1, 50],
        [30, 5000],
      ] as const) {
        const t1 = t0.AddDays(dt);
        const ref = Astro.HelioState(cuerpo as Astro.Body, t1);
        expect(distKm(estadoDesdeElementos(el, mu, t1.ut).r, ref)).toBeLessThan(tol);
        const n = integrar(
          derivadaHeliocentrica(pert),
          t0.ut,
          [s.x, s.y, s.z, s.vx, s.vy, s.vz],
          t1.ut,
        );
        expect(distKm(n.y, ref)).toBeLessThan(tol);
      }
    });
  }

  it('elementos del baricentro Tierra-Luna físicamente razonables (a ≈ 1 AU, e ≈ 0.017)', () => {
    const s = Astro.HelioState(Astro.Body.EMB, t0);
    const el = elementosDesdeEstado(
      { r: [s.x, s.y, s.z], v: [s.vx, s.vy, s.vz] },
      gm('Sun') + gm('EMB'),
      t0.ut,
    );
    expect(Math.abs(el.a - 1)).toBeLessThan(1e-3);
    expect(el.e).toBeGreaterThan(0.016);
    expect(el.e).toBeLessThan(0.0175);
  });
});
