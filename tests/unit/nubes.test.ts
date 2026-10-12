import { readFileSync } from 'node:fs';
import * as Astro from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { gm } from '../../src/core/dinamica';
import { estadoDesdeElementos } from '../../src/core/kepler';
import { eqjAEcl } from '../../src/core/marcos';
import { nubeDesdeRadiante, orbitaDeRadiante } from '../../src/core/montecarlo';
import { GRAD } from '../../src/core/vector';
import type { Catalogo, NubesPedigri } from '../../src/ui/catalogo';

const leer = <T>(r: string) => JSON.parse(readFileSync(r, 'utf8')) as T;
const catalogo = leer<Catalogo>('public/data/catalogo.json');
const nubes = leer<NubesPedigri>('public/data/nubes.json');
const chely = leer<{
  fuente_orbita: string;
  muestreo: { fuente: string };
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
      // Solo la órbita telescópica de JPL se sortea por elementos
      expect(n.metodo, p.id).toBe(p.id === 'almahata-sitta' ? 'elementos' : 'radiante');
    }
  });

  it('todas las órbitas pasan a menos de 0,002 au de la Tierra', () => {
    for (const [id, n] of Object.entries(nubes.piezas))
      expect(n.validacion.dist_max_au, id).toBeLessThan(0.002);
  });
});

describe('nube del recorrido de Chelyabinsk', () => {
  it('sale del radiante de Popova y sus 160 primeras órbitas son las del catálogo', () => {
    expect(chely.fuente_orbita).toBe('popova-2013-science');
    expect(chely.muestreo.fuente).toBe('popova-2013-science');
    expect(chely.clones).toHaveLength(300);
    nubes.piezas['chelyabinsk']!.formas.forEach(([a, e, i, nodo, omega], k) => {
      const c = chely.clones[k]!;
      for (const [x, y] of [
        [a, c.a],
        [e, c.e],
        [i, c.i],
        [nodo, c.nodo],
        [omega, c.omega],
      ])
        expect(Math.abs(x! - y!)).toBeLessThan(1e-4);
    });
  });

  it('en el instante de referencia, cada punto de la nube está junto a la Tierra', () => {
    for (const c of chely.clones) {
      const t = c.epoca_ut_j2000;
      const r = estadoDesdeElementos(
        {
          a: c.a,
          e: c.e,
          i: c.i * GRAD,
          nodo: c.nodo * GRAD,
          omega: c.omega * GRAD,
          M: c.M * GRAD,
          epoca: t,
        },
        gm('Sun'),
        t,
      ).r;
      const v = Astro.HelioVector(Astro.Body.Earth, Astro.MakeTime(t));
      const T = eqjAEcl([v.x, v.y, v.z]);
      expect(Math.hypot(r[0] - T[0], r[1] - T[1], r[2] - T[2])).toBeLessThan(0.002);
    }
  });

  it('la ficha dice bien que es más estrecha en a y más ancha en i que la órbita publicada', () => {
    const o = catalogo.piezas.find((p) => p.id === 'chelyabinsk')!.orbita!;
    expect(desviacion(chely.clones.map((c) => c.a))).toBeLessThan(o.a.s!);
    expect(desviacion(chely.clones.map((c) => c.i))).toBeGreaterThan(o.i.s!);
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
