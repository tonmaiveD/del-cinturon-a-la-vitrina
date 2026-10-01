import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Elementos } from '../../src/core/kepler';
import { montecarloBolido } from '../../src/core/montecarlo';
import {
  orbitaAtraccionCenital,
  orbitaDesdeBolido,
  type RegistroBolido,
} from '../../src/core/orbita-bolido';
import { dDrummond, type ElementosAngulares } from '../../src/core/similitud';
import { GRAD } from '../../src/core/vector';
import { Calibracion, type EventoCalibrado } from '../../src/schema';

const cal = Calibracion.parse(
  JSON.parse(readFileSync('data/calibracion/pena-asensio-2025.json', 'utf8')),
);
type Fila = { a: number; e: number; i: number; omega: number; nodo: number };
const angTabla = (o: Fila): ElementosAngulares => ({
  q: o.a * (1 - o.e),
  e: o.e,
  i: o.i * GRAD,
  nodo: o.nodo * GRAD,
  omega: o.omega * GRAD,
});
const angEl = (e: Elementos): ElementosAngulares => ({
  q: e.a * (1 - e.e),
  e: e.e,
  i: e.i,
  nodo: e.nodo,
  omega: e.omega,
});
const registro = (ev: EventoCalibrado): RegistroBolido => ({
  fecha: new Date(ev.fecha),
  latGrados: ev.lat,
  lonGrados: ev.lon,
  alturaKm: ev.alt_km,
  vEcefKmS: ev.v_ecef_kms,
});
const chelyabinsk = cal.eventos.find((e) => e.nombre === 'Chelyabinsk')!;

describe('órbita desde un registro CNEOS', () => {
  it('reproduce las órbitas calculadas por Peña-Asensio et al. 2025 desde CNEOS (18 eventos)', () => {
    const dds = cal.eventos.map((ev) =>
      dDrummond(angEl(orbitaDesdeBolido(registro(ev)).elementos), angTabla(ev.cneos_pena)),
    );
    for (const dd of dds) expect(dd).toBeLessThan(0.025);
    const ordenados = [...dds].sort((a, b) => a - b);
    expect(ordenados[Math.floor(ordenados.length / 2)]).toBeLessThan(0.01);
  });

  it('N-cuerpos y atracción cenital coinciden para Chelyabinsk (D_D < 0.005)', () => {
    const n = orbitaDesdeBolido(registro(chelyabinsk)).elementos;
    const z = orbitaAtraccionCenital(registro(chelyabinsk)).elementos;
    expect(dDrummond(angEl(n), angEl(z))).toBeLessThan(0.005);
  });

  it('Chelyabinsk: D_D < 0.1 frente a Popova et al. 2013 (criterio de parada)', () => {
    const n = orbitaDesdeBolido(registro(chelyabinsk)).elementos;
    expect(
      dDrummond(angEl(n), angTabla({ a: 1.76, e: 0.581, i: 4.93, omega: 108.3, nodo: 326.4422 })),
    ).toBeLessThan(0.1);
  });

  it('el Monte Carlo es determinista con semilla fija', () => {
    const inc = { sigmaV: 0.8, sigmaRaGrados: 2, sigmaDecGrados: 1.2 };
    const a = montecarloBolido(registro(chelyabinsk), inc, 3, 7).map((r) => r.elementos.a);
    const b = montecarloBolido(registro(chelyabinsk), inc, 3, 7).map((r) => r.elementos.a);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(3);
  });
});
