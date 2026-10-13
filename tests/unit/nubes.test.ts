import { readFileSync } from 'node:fs';
import * as Astro from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { gm } from '../../src/core/dinamica';
import { estadoDesdeElementos } from '../../src/core/kepler';
import { eqjAEcl } from '../../src/core/marcos';
import { nubeDesdeRadiante, orbitaDeRadiante } from '../../src/core/montecarlo';
import { GRAD } from '../../src/core/vector';
import { semillaDe } from '../../src/core/muestreo';
import { Meteorito } from '../../src/schema';
import type { Catalogo, NubesPedigri } from '../../src/ui/catalogo';
import { entradaPieza } from '../../pipeline/trayectorias-pedigri';
import {
  CRITERIO_ENCUENTRO,
  cumpleCriterio,
  distanciaMinima,
  encuentroCon,
  nubeCondicionada,
} from '../../pipeline/nubes-pedigri';
import { KM_POR_AU } from '../../src/core/marcos';

const leer = <T>(r: string) => JSON.parse(readFileSync(r, 'utf8')) as T;
const catalogo = leer<Catalogo>('public/data/catalogo.json');
const nubes = leer<NubesPedigri>('public/data/nubes.json');
const chely = leer<{
  fuente_orbita: string;
  muestreo: { metodo: string; fuente: string };
  nominal: { a: number; e: number; i: number; nodo: number; omega: number; epoca_ut_j2000: number };
  clones: {
    a: number;
    e: number;
    i: number;
    nodo: number;
    omega: number;
    M: number;
    epoca_ut_j2000: number;
  }[];
}>('public/data/chelyabinsk-orbitas.json');

const desviacion = (xs: number[]) => {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};

describe('nubes de órbitas de las piezas (public/data/nubes.json)', () => {
  const conOrbita = catalogo.piezas.filter((p) => p.orbita);

  it('hay una nube aprobada por pieza, de la misma fuente que su órbita principal', () => {
    expect(Object.keys(nubes.piezas).sort()).toEqual(conOrbita.map((p) => p.id).sort());
    for (const p of conOrbita) {
      const n = nubes.piezas[p.id]!;
      expect(n.validacion.aprobada, p.id).toBe(true);
      expect(n.fuente, p.id).toBe(p.orbita!.fuente);
      expect(n.formas, p.id).toHaveLength(160);
      // JPL (telescópica): sorteo por elementos; Chelyabinsk: elementos condicionados (opción C)
      expect(n.metodo, p.id).toBe(
        { 'almahata-sitta': 'elementos', chelyabinsk: 'elementos-condicionados' }[p.id] ??
          'radiante',
      );
    }
  });

  it('todas las órbitas pasan a menos de 0,002 au de la Tierra', () => {
    for (const [id, n] of Object.entries(nubes.piezas))
      expect(n.validacion.dist_max_au, id).toBeLessThan(0.002);
  });

  // Umbrales de regresión cerca de los valores obtenidos el 2026-10-12 (el criterio de parada
  // del pipeline es más laxo): D_D del centro ≤ 0,0019 y distancia máxima ≤ 0,0005 au
  it('regresión: el centro reproduce la órbita y las órbitas llegan a la Tierra con holgura', () => {
    for (const [id, n] of Object.entries(nubes.piezas)) {
      if (n.metodo === 'radiante') expect(n.validacion.dd_centro!, id).toBeLessThan(0.005);
      expect(n.validacion.dist_max_au, id).toBeLessThan(0.001);
      expect(n.descartados, id).toBe(0);
    }
  });

  it('la mediana de la nube queda a menos de 1σ de la órbita publicada en a, e, i y q', () => {
    for (const p of conOrbita) {
      const r = nubes.piezas[p.id]!.resumen;
      const o = p.orbita!;
      for (const k of ['a', 'e', 'i'] as const)
        if (o[k].s)
          expect(Math.abs(r[k].mediana - o[k].v) / o[k].s!, `${p.id} ${k}`).toBeLessThan(1);
      if (o.q?.s) expect(Math.abs(r.q.mediana - o.q.v) / o.q.s, `${p.id} q`).toBeLessThan(1);
    }
  });

  it('se sortea lo declarado: entradas del dataset y σ sorteadas compatibles con las de entrada', () => {
    for (const [id, n] of Object.entries(nubes.piezas)) {
      if (n.metodo !== 'radiante') continue;
      const m = Meteorito.parse(leer(`data/pedigri/${id}.json`));
      const r = m.radiante_geocentrico!;
      const e = n.entrada!;
      expect(n.semilla, id).toBe(semillaDe(id));
      expect([e.ra, e.dec, e.vg], id).toEqual([
        { v: r.ra.valor, s: r.ra.sigma },
        { v: r.dec.valor, s: r.dec.sigma },
        { v: r.v_geocentrica.valor, s: r.v_geocentrica.sigma },
      ]);
      // Error típico de una desviación típica muestral: σ/√(2N); se admiten 4 errores típicos
      const tol = 4 / Math.sqrt(2 * n.sorteadas);
      for (const k of ['ra', 'dec', 'vg'] as const)
        expect(Math.abs(e.sigma_sorteada[k] / e[k].s - 1), `${id} ${k}`).toBeLessThan(tol);
    }
  });
});

describe('nube del recorrido de Chelyabinsk (opción C)', () => {
  const m = Meteorito.parse(leer('data/pedigri/chelyabinsk.json'));
  const o = m.orbitas.find((x) => x.fuente === 'popova-2013-science')!;
  const instante = new Date(String(m.entrada_atmosferica!.instante.valor));
  const tierra = () => {
    const v = Astro.HelioVector(Astro.Body.Earth, Astro.MakeTime(instante));
    return eqjAEcl([v.x, v.y, v.z]);
  };

  it('sale de la órbita de Popova y sus 160 primeras órbitas son las del catálogo', () => {
    expect(chely.fuente_orbita).toBe('popova-2013-science');
    expect(chely.muestreo).toMatchObject({
      metodo: 'elementos-condicionados',
      fuente: 'popova-2013-science',
    });
    expect(chely.clones).toHaveLength(300);
    const c = nubes.piezas['chelyabinsk']!.condicion!;
    const cc = o.cifras_completas!;
    expect(c.central).toEqual({ q: cc.q, e: cc.e, i: cc.i, omega: cc.omega, nodo: cc.nodo });
    expect(c.sigma).toEqual({
      q: o.q!.sigma,
      e: o.e.sigma,
      i: o.i.sigma,
      omega: o.omega.sigma,
      nodo: o.nodo.sigma,
    });
    nubes.piezas['chelyabinsk']!.formas.forEach(([a, e, i, nodo, omega], k) => {
      const g = chely.clones[k]!;
      for (const [x, y] of [
        [a, g.a],
        [e, g.e],
        [i, g.i],
        [nodo, g.nodo],
        [omega, g.omega],
      ])
        expect(Math.abs(x! - y!)).toBeLessThan(1e-4);
    });
  });

  const enRadianes = (c: (typeof chely.clones)[number]) => ({
    a: c.a,
    e: c.e,
    i: c.i * GRAD,
    nodo: c.nodo * GRAD,
    omega: c.omega * GRAD,
    M: c.M * GRAD,
    epoca: c.epoca_ut_j2000,
  });

  it('cada órbita de la nube choca con la Tierra: parámetro de impacto ≤ radio de captura', () => {
    const T = tierra();
    const t = Astro.MakeTime(instante);
    for (const c of chely.clones) {
      expect(c.epoca_ut_j2000).toBeCloseTo(t.ut, 9);
      const x = encuentroCon(enRadianes(c), t);
      expect(x.bKm).toBeLessThanOrEqual(x.radioCapturaKm);
      expect(cumpleCriterio(x, CRITERIO_ENCUENTRO)).toBe(true);
      // Cada órbita está en su punto más cercano a la Tierra en ese instante
      const r = estadoDesdeElementos(enRadianes(c), gm('Sun'), t.ut).r;
      const d = Math.hypot(r[0] - T[0], r[1] - T[1], r[2] - T[2]) * KM_POR_AU;
      expect(Math.abs(d - x.distanciaKm)).toBeLessThan(1);
      expect(d - distanciaMinima(c, T).d * KM_POR_AU).toBeLessThan(1);
      // Regresión (2026-10-12): radio de captura de 7873 a 8111 km, distancia < 13 400 km
      expect(x.radioCapturaKm).toBeGreaterThan(7700);
      expect(x.radioCapturaKm).toBeLessThan(8300);
      expect(d).toBeLessThan(15000);
    }
  });

  it('el criterio acepta las órbitas calculadas desde estados reales de entrada', () => {
    // Clones desde el radiante geocéntrico de Popova (caso A): chocan por construcción
    const { base, radiante } = entradaPieza(m);
    const cs = (v: { valor: unknown; sigma?: number }) => ({ v: v.valor as number, s: v.sigma! });
    const { clones } = nubeDesdeRadiante(
      base,
      { ra: cs(radiante.ra), dec: cs(radiante.dec), vg: cs(radiante.vg) },
      4,
      semillaDe(m.id),
    );
    const t = Astro.MakeTime(base.fecha);
    for (const c of clones) {
      const x = encuentroCon(c.elementos, t);
      expect(x.bKm).toBeLessThanOrEqual(x.radioCapturaKm);
      // …aunque en ese instante estén más lejos que el radio de captura: la distancia
      // geométrica no es la magnitud que se compara con él
      expect(x.distanciaKm).toBeGreaterThan(x.radioCapturaKm);
    }
  });

  it('la línea central (cifras completas) choca con la Tierra; la redondeada pasa lejos', () => {
    const T = tierra();
    const n = chely.nominal;
    const x = encuentroCon(
      {
        a: n.a,
        e: n.e,
        i: n.i * GRAD,
        nodo: n.nodo * GRAD,
        omega: n.omega * GRAD,
        M: (n as { M?: number }).M! * GRAD,
        epoca: n.epoca_ut_j2000,
      },
      Astro.MakeTime(instante),
    );
    expect(x.bKm).toBeLessThanOrEqual(x.radioCapturaKm);
    const redondeada = {
      a: o.a.valor as number,
      e: o.e.valor as number,
      i: o.i.valor as number,
      nodo: o.nodo.valor as number,
      omega: o.omega.valor as number,
    };
    expect(distanciaMinima(redondeada, T).d * KM_POR_AU).toBeGreaterThan(100000);
  });

  it('la ficha dice bien: reproduce σe y σi, σq y σω salen menores y σa no llega a la del artículo', () => {
    const sd = (f: (c: (typeof chely.clones)[number]) => number) => desviacion(chely.clones.map(f));
    expect(Math.abs(sd((c) => c.e) / o.e.sigma! - 1)).toBeLessThan(0.15);
    expect(Math.abs(sd((c) => c.i) / o.i.sigma! - 1)).toBeLessThan(0.15);
    expect(sd((c) => c.a * (1 - c.e))).toBeLessThan(o.q!.sigma!);
    expect(sd((c) => c.omega)).toBeLessThan(o.omega.sigma!);
    // σa máxima compatible con σq y σe (a = q/(1 − e), correlación perfecta) < σa del artículo
    const q = o.q!.valor as number;
    const e = o.e.valor as number;
    const maxima = o.q!.sigma! / (1 - e) + (q / (1 - e) ** 2) * o.e.sigma!;
    expect(maxima).toBeLessThan(o.a.sigma!);
    expect(sd((c) => c.a)).toBeLessThan(maxima);
  });
});

describe('sensibilidad de la nube de Chelyabinsk (docs/reportes/nubes.md)', () => {
  const sens = nubes.sensibilidad_chelyabinsk!;
  const caso = (inicio: string) => sens.find((x) => x.caso.startsWith(inicio))!.sigma;
  it('A: la declinación da la mayor parte de σi y la nube sale más ancha que la órbita', () => {
    expect(caso('A: solo δ_g').i / caso('A: radiante geocéntrico').i).toBeGreaterThan(0.8);
    expect(caso('A: radiante geocéntrico').i).toBeGreaterThan(0.24 * 1.4);
  });
  it('B sale más estrecha que la órbita publicada y C la reproduce en i', () => {
    expect(caso('B:').i).toBeLessThan(0.24 * 0.75);
    expect(Math.abs(caso('C: elementos').i / 0.24 - 1)).toBeLessThan(0.15);
  });
  it('A cumple el criterio de C y el criterio anterior dejaba pasar órbitas sin choque', () => {
    const enc = (inicio: string) => sens.find((x) => x.caso.startsWith(inicio))!.encuentro!;
    expect(enc('A: radiante geocéntrico').sin_choque).toBe(0);
    expect(enc('C: elementos').sin_choque).toBe(0);
    expect(enc('C con el criterio anterior').sin_choque).toBeGreaterThan(0);
  });
});

describe('reproducibilidad', () => {
  it('con su semilla se recalculan las mismas órbitas de Chelyabinsk (opción C)', () => {
    const m = Meteorito.parse(leer('data/pedigri/chelyabinsk.json'));
    const { clones } = nubeCondicionada(m, 3);
    clones.forEach((c, k) => {
      const g = chely.clones[k]!;
      expect(c.a).toBeCloseTo(g.a, 12);
      expect(c.e).toBeCloseTo(g.e, 12);
      expect(c.i / GRAD).toBeCloseTo(g.i, 10);
      expect(c.M / GRAD).toBeCloseTo(g.M, 10);
    });
  });

  it('con sus entradas y su semilla se recalculan las mismas órbitas de una nube desde el radiante', () => {
    const m = Meteorito.parse(leer('data/pedigri/pribram.json'));
    const { base, radiante } = entradaPieza(m);
    const cs = (v: { valor: unknown; sigma?: number }) => ({ v: v.valor as number, s: v.sigma! });
    const { clones } = nubeDesdeRadiante(
      base,
      { ra: cs(radiante.ra), dec: cs(radiante.dec), vg: cs(radiante.vg) },
      2,
      semillaDe('pribram'),
    );
    clones.forEach((c, k) => {
      const [a, e, i] = nubes.piezas['pribram']!.formas[k]!;
      expect(Math.abs(c.elementos.a - a)).toBeLessThan(1e-6);
      expect(Math.abs(c.elementos.e - e)).toBeLessThan(1e-6);
      expect(Math.abs(c.elementos.i / GRAD - i)).toBeLessThan(1e-4);
    });
  });
});

describe('nubeDesdeRadiante', () => {
  it('sin incertidumbre, cada clon es la órbita del radiante central', () => {
    const base = {
      fecha: new Date('2013-02-15T03:20:19.968Z'),
      latGrados: 54.454,
      lonGrados: 64.477,
      alturaKm: 100,
    };
    const central = orbitaDeRadiante({ ...base, raGrados: 333.2, decGrados: 0.3, vgKmS: 15.3 });
    const { clones, descartados } = nubeDesdeRadiante(
      base,
      { ra: { v: 333.2, s: 0 }, dec: { v: 0.3, s: 0 }, vg: { v: 15.3, s: 0 } },
      2,
      1,
    );
    expect(descartados).toBe(0);
    for (const c of clones) expect(c.elementos).toEqual(central.elementos);
  });
});
