import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { construirCatalogo } from '../../pipeline/catalogo';
import { muestrearOrbita, puntosForma, semillaDe } from '../../src/core/muestreo';
import { estadoDesdeElementos } from '../../src/core/kepler';
import { gm } from '../../src/core/dinamica';
import { Fuentes, Meteorito, RegionEscape, RegionesOrigen } from '../../src/schema';
import { citaCorta, cumpleFiltro, grupoClase } from '../../src/ui/catalogo';

const leer = (r: string): unknown => JSON.parse(readFileSync(r, 'utf8'));
const meteoritos = readdirSync('data/pedigri')
  .filter((f) => f.endsWith('.json'))
  .map((f) => Meteorito.parse(leer(`data/pedigri/${f}`)));
const catalogo = construirCatalogo({
  fuentes: Fuentes.parse(leer('data/fuentes.json')),
  meteoritos,
  regiones: RegionesOrigen.parse(leer('data/regiones-origen.json')),
  escape: RegionEscape.array().parse(leer('data/regiones-escape.json')),
});

describe('grupo de clase (solo para filtrar)', () => {
  it.each([
    ['H5', 'H'],
    ['H5/6', 'H'],
    ['L3/L3.9', 'L'],
    ['LL5', 'LL'],
    ['CM2', 'carbonacea'],
    ['C2', 'carbonacea'],
    ['EL6', 'enstatita'],
    ['Ure-Anom', 'acondrita'],
    ['Euc-Anom', 'acondrita'],
    ['H5/LL3.5', 'varios'],
    ['L5/LL5(?)', 'varios'],
  ])('%s → %s', (clase, grupo) => expect(grupoClase(clase)).toBe(grupo));
});

describe('cita corta', () => {
  it('dos autores, et al. y entidades', () => {
    expect(citaCorta('Granvik, M., Brown, P. (2018). Identification…')).toBe(
      'Granvik y Brown 2018',
    );
    expect(citaCorta('Popova, O. P. et al. (2013). Chelyabinsk…')).toBe('Popova et al. 2013');
    expect(citaCorta('Warner, B. D., Harris, A. W., Vokrouhlický, D. (2009). Analysis…')).toBe(
      'Warner et al. 2009',
    );
    expect(citaCorta('Cross, D. Astronomy Engine, v2.1.19.')).toBe('Astronomy Engine');
  });
});

describe('catálogo generado a partir del dataset', () => {
  it('incluye las 25 caídas, cada una con órbita principal y asociación o motivo', () => {
    expect(catalogo.piezas).toHaveLength(meteoritos.length);
    for (const p of catalogo.piezas) {
      expect(p.orbita, p.id).not.toBeNull();
      expect(p.asociacion.fuentes.length, p.id).toBeGreaterThan(0);
    }
  });

  it('usa la órbita principal declarada (Chelyabinsk: Popova; Almahata Sitta: JPL)', () => {
    const fuente = (id: string) => catalogo.piezas.find((p) => p.id === id)!.orbita!.fuente;
    expect(fuente('chelyabinsk')).toBe('popova-2013-science');
    expect(fuente('almahata-sitta')).toBe('jpl-horizons');
  });

  it('no mezcla fuentes en las probabilidades de escape (cada grupo, una fuente)', () => {
    const chely = catalogo.piezas.find((p) => p.id === 'chelyabinsk')!;
    const fuentes = chely.escape.map((g) => g.fuente);
    expect(new Set(fuentes).size).toBe(fuentes.length);
    expect(fuentes).toContain('popova-2013-science');
    expect(fuentes).toContain('granvik-brown-2018');
    // Los valores de cada grupo coinciden con el dataset de esa fuente
    const m = meteoritos.find((x) => x.id === 'chelyabinsk')!;
    for (const g of chely.escape)
      for (const r of g.regiones) {
        const original = m.procedencia!.find(
          (x) => x.region === r.region && x.probabilidad.fuente === g.fuente,
        )!;
        expect(r.p).toBe(original.probabilidad.valor);
      }
  });

  it('solo dibuja zonas con rangos publicados; ν6 y JFC quedan como texto', () => {
    expect(catalogo.zonas.map((z) => z.id).sort()).toEqual(['hungaria', 'phocaea']);
    expect(catalogo.zonas.find((z) => z.id === 'phocaea')!.elementos).toBe('propios');
    expect(catalogo.sin_geometria.map((z) => z.id).sort()).toEqual([
      'cometas-jfc',
      'resonancia-nu6',
    ]);
    const a = Object.fromEntries(catalogo.resonancias.map((r) => [r.id, r.a]));
    expect(a['resonancia-3-1']).toBeCloseTo(2.502, 3);
    expect(a['resonancia-5-2']).toBeCloseTo(2.825, 3);
    expect(a['resonancia-2-1']).toBeCloseTo(3.278, 3);
  });

  it('cada fuente referenciada tiene cita corta', () => {
    for (const p of catalogo.piezas) {
      expect(catalogo.fuentes[p.orbita!.fuente]).toBeTruthy();
      for (const g of p.escape) expect(catalogo.fuentes[g.fuente]).toBeTruthy();
      for (const f of p.asociacion.fuentes) expect(catalogo.fuentes[f]).toBeTruthy();
    }
  });

  it('public/data/catalogo.json está al día con el dataset', () => {
    expect(existsSync('public/data/catalogo.json')).toBe(true);
    expect(leer('public/data/catalogo.json')).toEqual(JSON.parse(JSON.stringify(catalogo)));
  });

  it('filtros por grupo y por confianza de la asociación', () => {
    const n = (f: Parameters<typeof cumpleFiltro>[1]) =>
      catalogo.piezas.filter((p) => cumpleFiltro(p, f)).length;
    expect(n({ grupo: '', confianza: '' })).toBe(25);
    expect(n({ grupo: '', confianza: 'alto' })).toBe(1); // Almahata Sitta (2008 TC3)
    expect(n({ grupo: 'LL', confianza: 'medio' })).toBe(1); // Chelyabinsk
    expect(n({ grupo: '', confianza: 'ninguna' })).toBe(4);
  });
});

describe('muestreo de órbitas publicadas', () => {
  const o = catalogo.piezas.find((p) => p.id === 'park-forest')!.orbita!;

  it('es determinista por pieza y reproduce media y σ publicadas', () => {
    const a = muestrearOrbita(o, 4000, semillaDe('park-forest'));
    expect(muestrearOrbita(o, 5, semillaDe('park-forest'))).toEqual(a.slice(0, 5));
    const media = a.reduce((s, x) => s + x.a, 0) / a.length;
    const sd = Math.sqrt(a.reduce((s, x) => s + (x.a - media) ** 2, 0) / a.length);
    expect(media).toBeCloseTo(o.a.v, 1);
    expect(sd / o.a.s!).toBeGreaterThan(0.95);
    expect(sd / o.a.s!).toBeLessThan(1.05);
  });

  it('solo produce órbitas elípticas', () => {
    const casi = {
      a: { v: 2, s: 0.5 },
      e: { v: 0.95, s: 0.1 },
      i: { v: 5 },
      nodo: { v: 0 },
      omega: { v: 0 },
    };
    for (const f of muestrearOrbita(casi, 500, 1)) {
      expect(f.e).toBeLessThan(1);
      expect(f.e).toBeGreaterThanOrEqual(0);
    }
  });

  it('los puntos de la elipse coinciden con Kepler (perihelio y afelio)', () => {
    const f = { a: o.a.v, e: o.e.v, i: o.i.v, nodo: o.nodo.v, omega: o.omega.v };
    const [peri, afe] = puntosForma(f, 2);
    const g = Math.PI / 180;
    const el = { a: f.a, e: f.e, i: f.i * g, nodo: f.nodo * g, omega: f.omega * g, M: 0, epoca: 0 };
    const mu = gm('Sun');
    const P = 2 * Math.PI * Math.sqrt(f.a ** 3 / mu);
    const k1 = estadoDesdeElementos(el, mu, 0).r;
    const k2 = estadoDesdeElementos(el, mu, P / 2).r;
    for (let j = 0; j < 3; j++) {
      expect(peri![j]).toBeCloseTo(k1[j]!, 9);
      expect(afe![j]).toBeCloseTo(k2[j]!, 9);
    }
  });
});
