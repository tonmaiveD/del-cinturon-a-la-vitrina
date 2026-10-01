import * as Astro from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import {
  ecefAEqj,
  eclAEqj,
  eqjAEcef,
  eqjAEcl,
  estadoPuntoTerrestre,
  KM_POR_AU,
  SEGUNDOS_POR_DIA,
} from '../../src/core/marcos';
import { escala, norma, resta, type Vec3 } from '../../src/core/vector';

const t = Astro.MakeTime(new Date('2013-02-15T03:20:33Z'));
const km = (v: Vec3) => escala(v, KM_POR_AU);

describe('EQJ ↔ eclíptica J2000', () => {
  it('coincide con RotateVector de astronomy-engine', () => {
    const v: Vec3 = [0.3, -1.2, 0.7];
    const ref = Astro.RotateVector(Astro.Rotation_EQJ_ECL(), new Astro.Vector(...v, t));
    expect(norma(resta(eqjAEcl(v), [ref.x, ref.y, ref.z]))).toBeLessThan(1e-15);
  });
  it('ida y vuelta es la identidad', () => {
    const v: Vec3 = [0.3, -1.2, 0.7];
    expect(norma(resta(eclAEqj(eqjAEcl(v)), v))).toBeLessThan(1e-15);
  });
  it('el polo eclíptico está inclinado ~23.44° respecto al ecuatorial', () => {
    const polo = eclAEqj([0, 0, 1]);
    expect((Math.acos(polo[2]) * 180) / Math.PI).toBeCloseTo(23.44, 2);
  });
});

describe('ECEF ↔ EQJ', () => {
  it('un punto terrestre tiene coordenadas ECEF constantes en el tiempo (error < 1 m)', () => {
    const obs = new Astro.Observer(54.8, 61.1, 0);
    const ecef = (tt: Astro.AstroTime) => {
      const r = Astro.ObserverVector(tt, obs, false);
      return km(eqjAEcef([r.x, r.y, r.z], tt));
    };
    const r0 = ecef(t);
    for (const dias of [0.137, 0.5, 3.21]) {
      expect(norma(resta(ecef(t.AddDays(dias)), r0))).toBeLessThan(1e-3);
    }
  });

  it('lat 0, lon 0 cae sobre +x ECEF; lat 0, lon 90 sobre +y; el polo sobre +z', () => {
    const ecef = (lat: number, lon: number) => {
      const r = Astro.ObserverVector(t, new Astro.Observer(lat, lon, 0), false);
      return km(eqjAEcef([r.x, r.y, r.z], t));
    };
    const [x0, y0, z0] = ecef(0, 0);
    expect(x0).toBeGreaterThan(6370);
    expect(Math.abs(y0) + Math.abs(z0)).toBeLessThan(1e-3);
    const [x1, y1] = ecef(0, 90);
    expect(Math.abs(x1)).toBeLessThan(1e-3);
    expect(y1).toBeGreaterThan(6370);
    const [x2, y2, z2] = ecef(90, 0);
    expect(Math.hypot(x2, y2)).toBeLessThan(1e-3);
    expect(z2).toBeGreaterThan(6350);
    expect(z2).toBeLessThan(x0); // achatamiento polar
  });

  it('ecefAEqj y eqjAEcef son inversas', () => {
    const v: Vec3 = [1, 2, 3];
    expect(norma(resta(eqjAEcef(ecefAEqj(v, t), t), v))).toBeLessThan(1e-14);
  });

  it('la velocidad de arrastre es la derivada temporal de la posición rotada (ω × r)', () => {
    const lat = 54.8;
    const lon = 61.1;
    const h = 30_000;
    const { r, v } = estadoPuntoTerrestre(lat, lon, h, t);
    const ecef = eqjAEcef(r, t);
    const dt = 1 / SEGUNDOS_POR_DIA; // 1 s
    const dif = escala(
      resta(ecefAEqj(ecef, t.AddDays(dt)), ecefAEqj(ecef, t.AddDays(-dt))),
      1 / (2 * dt),
    );
    const errKmS = (norma(resta(dif, v)) * KM_POR_AU) / SEGUNDOS_POR_DIA;
    expect(errKmS).toBeLessThan(1e-5);
    // Orden de magnitud físico: ~0.27 km/s a 55° de latitud
    expect((norma(v) * KM_POR_AU) / SEGUNDOS_POR_DIA).toBeCloseTo(
      0.465 * Math.cos((lat * Math.PI) / 180),
      2,
    );
  });
});
