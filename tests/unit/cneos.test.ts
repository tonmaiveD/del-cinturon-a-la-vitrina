import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { OrbitaCalculada, ResumenCneos } from '../../src/cneos/resumen';
import { grupoBajoDd, leerEventos, registroDe } from '../../src/cneos/eventos';
import { perturbarVelocidad } from '../../src/core/montecarlo';
import { crearAzar } from '../../src/core/azar';
import { orbitaDesdeBolido } from '../../src/core/orbita-bolido';
import { dDrummond } from '../../src/core/similitud';
import { Calibracion, CalidadCneos, RespuestaCneos } from '../../src/schema';

const leer = (r: string): unknown => JSON.parse(readFileSync(r, 'utf8'));
const crudo = RespuestaCneos.parse(leer('data/cneos/eventos.json'));
const eventos = leerEventos(crudo.respuesta);
const tabla4 = CalidadCneos.parse(leer('data/calibracion/pena-asensio-2025-tabla4.json'));
const cal = Calibracion.parse(leer('data/calibracion/pena-asensio-2025.json'));
const GRAD = Math.PI / 180;

describe('lectura de la respuesta del CNEOS', () => {
  it('todos los eventos tienen id único y fecha ISO', () => {
    expect(eventos.length).toBe(Number(crudo.respuesta.count));
    expect(new Set(eventos.map((e) => e.id)).size).toBe(eventos.length);
    for (const e of eventos) expect(e.fecha).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  });

  it('Chelyabinsk coincide con el registro guardado en la Fase 1', () => {
    const viejo = leer('data/cneos/chelyabinsk.json') as {
      respuesta: { fields: string[]; data: string[][] };
    };
    const [ref] = leerEventos(viejo.respuesta);
    const ev = eventos.find((e) => e.fecha === ref!.fecha)!;
    expect(ev).toEqual(ref);
    expect(ev.calidad).toBe('orbita');
  });

  it('signos de lat/lon según la dirección publicada', () => {
    const ix = new Map(crudo.respuesta.fields.map((k, i) => [k, i]));
    crudo.respuesta.data.forEach((fila, k) => {
      if (fila[ix.get('lat')!] === null) return;
      expect(eventos[k]!.lat! < 0).toBe(fila[ix.get('lat-dir')!] === 'S');
      expect(eventos[k]!.lon! < 0).toBe(fila[ix.get('lon-dir')!] === 'W');
    });
  });
});

describe('grupo de fiabilidad (Peña-Asensio et al. 2025, Tabla 4)', () => {
  it('límites: año ≥ 2018 o E_i ≥ 0,45 kt', () => {
    expect(grupoBajoDd('2017-12-31T23:59:59Z', 0.44)).toBe(false);
    expect(grupoBajoDd('2018-01-01T00:00:00Z', 0.01)).toBe(true);
    expect(grupoBajoDd('2010-01-01T00:00:00Z', 0.45)).toBe(true);
  });

  it('la tabla guardada declara la misma regla', () => {
    expect(tabla4.grupos.map((g) => g.condicion)).toEqual([
      'anio >= 2018 || impacto_kt >= 0.45',
      'anio < 2018 && impacto_kt < 0.45',
    ]);
  });

  it('sin falsos positivos en los 18 eventos calibrados: todo «fiable» tiene D_D < 0,1', () => {
    const fiables = cal.eventos.filter((e) => grupoBajoDd(e.fecha, e.energia_impacto_kt));
    for (const e of fiables) expect(e.ref.dd, e.nombre).toBeLessThan(0.1);
    // Conservadora: dos eventos del grupo «no fiable» tienen buena órbita (Košice, Baird Bay)
    const aciertos = cal.eventos.filter(
      (e) => grupoBajoDd(e.fecha, e.energia_impacto_kt) === e.ref.dd < 0.1,
    );
    expect(aciertos.length).toBe(16);
  });

  it('solo los eventos con vector, altura y grupo de bajo D_D tienen órbita', () => {
    for (const e of eventos) {
      if (e.calidad === 'orbita') {
        expect(e.v_ecef_kms && e.alt_km !== undefined).toBeTruthy();
        expect(grupoBajoDd(e.fecha, e.impacto_kt)).toBe(true);
      }
      if (e.calidad === 'orbita-no-fiable') expect(grupoBajoDd(e.fecha, e.impacto_kt)).toBe(false);
    }
  });
});

const RESUMEN = 'public/data/cneos/eventos.json';
describe('órbitas calculadas (public/data/cneos)', () => {
  let resumen: ResumenCneos;
  beforeAll(() => {
    resumen = leer(RESUMEN) as ResumenCneos;
  });

  it('el resumen está al día con la respuesta cruda', () => {
    expect(resumen.consultado).toBe(crudo.consultado);
    const sinOrbita = resumen.eventos.map((e) =>
      Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'orbita')),
    );
    expect(sinOrbita).toEqual(eventos);
  });

  it('cada evento con órbita tiene su archivo, con la σ de la Tabla 4 (mediana / 0,6745)', () => {
    const bajo = tabla4.grupos.find((g) => g.id === 'bajo-dd')!;
    for (const e of resumen.eventos.filter((x) => x.calidad === 'orbita')) {
      const o = leer(`public/data/cneos/orbitas/${e.id}.json`) as OrbitaCalculada;
      if ('error' in e.orbita!) {
        expect('error' in o).toBe(true);
        continue;
      }
      expect(o.metodo.sigma.v_kms).toBeCloseTo(bajo.v_kms.mediana / 0.6744897501960817, 4);
      expect(o.metodo.sigma.alfa_grados).toBeCloseTo(
        bajo.alfa_g_grados.mediana / 0.6744897501960817,
        4,
      );
      expect(e.orbita!.n + o.metodo.clones_fallidos).toBe(o.metodo.clones_pedidos);
    }
  });

  it('Chelyabinsk: la órbita nominal guardada está a D_D < 0,1 de Popova et al. 2013', () => {
    const ev = resumen.eventos.find((e) => e.fecha.startsWith('2013-02-15T03'))!;
    const o = leer(`public/data/cneos/orbitas/${ev.id}.json`) as OrbitaCalculada;
    const [a, e, i, nodo, omega] = o.nominal as [number, number, number, number, number];
    const dd = dDrummond(
      { q: a * (1 - e), e, i: i * GRAD, nodo: nodo * GRAD, omega: omega * GRAD },
      {
        q: 1.76 * (1 - 0.581),
        e: 0.581,
        i: 4.93 * GRAD,
        nodo: 326.4422 * GRAD,
        omega: 108.3 * GRAD,
      },
    );
    expect(dd).toBeLessThan(0.1);
  });

  it('los clones son reproducibles (semilla por evento)', () => {
    const ev = resumen.eventos.find((e) => e.orbita && !('error' in e.orbita))!;
    const o = leer(`public/data/cneos/orbitas/${ev.id}.json`) as OrbitaCalculada;
    const { normal } = crearAzar(o.metodo.semilla);
    const reg = registroDe(ev);
    const inc = {
      sigmaV: o.metodo.sigma.v_kms,
      sigmaRaGrados: o.metodo.sigma.alfa_grados,
      sigmaDecGrados: o.metodo.sigma.delta_grados,
    };
    const primero = orbitaDesdeBolido({
      ...reg,
      vEcefKmS: perturbarVelocidad(reg.vEcefKmS, inc, normal),
    });
    expect(o.clones[0]![0]).toBeCloseTo(primero.elementos.a, 3);
    expect(o.clones[0]![1]).toBeCloseTo(primero.elementos.e, 4);
  });
});
