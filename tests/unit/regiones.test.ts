import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { semiejeJupiter, semiejeResonancia } from '../../src/core/resonancias';
import { Fuentes, Meteorito, RegionEscape, RegionesOrigen } from '../../src/schema';

const fuentes = new Map(
  Fuentes.parse(JSON.parse(readFileSync('data/fuentes.json', 'utf8'))).map((f) => [f.id, f]),
);
const regiones = RegionesOrigen.parse(
  JSON.parse(readFileSync('data/regiones-origen.json', 'utf8')),
);
const escape = RegionEscape.array().parse(
  JSON.parse(readFileSync('data/regiones-escape.json', 'utf8')),
);
const meteoritos = new Map(
  readdirSync('data/pedigri')
    .filter((f) => f.endsWith('.json'))
    .map((f) => Meteorito.parse(JSON.parse(readFileSync(`data/pedigri/${f}`, 'utf8'))))
    .map((m) => [m.id, m]),
);

/** Patrón de clase → expresión regular sobre la clasificación publicada. */
const PATRON: Record<string, RegExp> = {
  LL: /^LL\d/,
  H: /^H\d(\/\d)?$/,
  L: /^L\d/,
  CM: /^CM\d/,
  C: /^C\d$/,
  ureilita: /^Ure/i,
  howardita: /^How/i,
  eucrita: /^Euc(?!-Anom)/i,
  diogenita: /^Dio/i,
};

describe('asociaciones clase → procedencia', () => {
  it.each(regiones.asociaciones.map((r) => [r.id, r] as const))(
    '%s: la clase de cada meteorito es compatible',
    (_id, r) => {
      for (const id of r.meteoritos) {
        const clase = String(meteoritos.get(id)!.clase.valor);
        expect(
          r.clases.some((c) => PATRON[c]!.test(clase)),
          `${id} (${clase}) no encaja en ${r.clases.join(', ')}`,
        ).toBe(true);
      }
    },
  );

  it('la confianza "alta" solo se apoya en fuentes con metadatos verificados', () => {
    for (const r of regiones.asociaciones.filter((x) => x.confianza === 'alto'))
      for (const f of r.fuentes)
        expect(fuentes.get(f)?.metadatos_verificados, `${r.id}: ${f}`).toBe(true);
  });

  it('ninguna eucrita anómala se asigna a Vesta', () => {
    const vesta = regiones.asociaciones.find((r) => r.id === 'vesta-hed')!;
    for (const id of vesta.meteoritos)
      expect(String(meteoritos.get(id)!.clase.valor)).not.toMatch(/Anom/i);
  });
});

describe('regiones de escape', () => {
  it('son las 7 del modelo de Granvik et al. 2018', () => {
    expect(escape.map((r) => r.id).sort()).toEqual(
      [
        'cometas-jfc',
        'hungaria',
        'phocaea',
        'resonancia-2-1',
        'resonancia-3-1',
        'resonancia-5-2',
        'resonancia-nu6',
      ].sort(),
    );
  });

  it('las geometrías tienen rangos coherentes', () => {
    for (const r of escape.filter((x) => x.geometria)) {
      const g = r.geometria!;
      expect(g.a_min.valor as number).toBeLessThan(g.a_max.valor as number);
      if (g.i_min && g.i_max) expect(g.i_min.valor as number).toBeLessThan(g.i_max.valor as number);
    }
  });

  it('el centro nominal de la 3:1 coincide con «a ≈ 2,5 AU» (Granvik et al. 2018)', () => {
    const aJ = semiejeJupiter();
    expect(aJ).toBeGreaterThan(5.1);
    expect(aJ).toBeLessThan(5.3);
    expect(semiejeResonancia(3, 1, aJ)).toBeCloseTo(2.5, 1);
    // Orden físico de las resonancias en el cinturón
    expect(semiejeResonancia(3, 1, aJ)).toBeLessThan(semiejeResonancia(5, 2, aJ));
    expect(semiejeResonancia(5, 2, aJ)).toBeLessThan(semiejeResonancia(2, 1, aJ));
  });
});
