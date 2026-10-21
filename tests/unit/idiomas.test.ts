import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  aprobado,
  idiomasIncluidos,
  leerRevisiones,
  rutasIdioma,
} from '../../pipeline/idiomas-publicables';
import { idiomasBorradorEnDist } from '../../pipeline/verificar-dist';
import { fijarIdioma, registrarIdioma, t, tDato } from '../../src/i18n';
import { textosDeDatos } from '../../src/i18n/datos';
import { idiomaInicial } from '../../src/i18n/eleccion';
import es from '../../src/i18n/es.json';
import type { Catalogo } from '../../src/ui/catalogo';

const LARGO = 'This sentence is long enough to be used as a witness in dist.';
const carpeta = (revision: object, en?: object, datos?: object) => {
  const dir = mkdtempSync(join(tmpdir(), 'i18n-'));
  writeFileSync(join(dir, 'revision.json'), JSON.stringify(revision));
  if (en) writeFileSync(join(dir, 'en.json'), JSON.stringify(en));
  if (datos) writeFileSync(join(dir, 'datos.en.json'), JSON.stringify(datos));
  return dir;
};
const parametros = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('idiomas (M38): elección, publicación y traducción de datos', () => {
  afterEach(() => fijarIdioma('es'));

  it('idioma inicial: ?lang, luego el navegador, luego español', () => {
    const d = ['es', 'en'];
    expect(idiomaInicial('?lang=en', ['es-AR'], d)).toEqual({ idioma: 'en', explicito: 'en' });
    expect(idiomaInicial('?lang=es', ['en-US'], d)).toEqual({ idioma: 'es', explicito: 'es' });
    expect(idiomaInicial('', ['en-US', 'es'], d)).toEqual({ idioma: 'en' });
    expect(idiomaInicial('', ['fr-FR'], d)).toEqual({ idioma: 'es' });
    // Un idioma no publicado no se ofrece aunque se pida
    expect(idiomaInicial('?lang=en', ['en-US'], ['es'])).toEqual({ idioma: 'es' });
  });

  it('sin traducción, la interfaz cae al español; un dato se traduce solo desde su original', () => {
    registrarIdioma(
      'en',
      { 'app.titulo': 'From the belt to the showcase' },
      {
        'region:hungaria': { es: 'Grupo Hungaria', en: 'Hungaria group' },
      },
    );
    fijarIdioma('en');
    expect(t('app.titulo')).toBe('From the belt to the showcase');
    expect(t('app.subtitulo')).toBe(es['app.subtitulo']);
    expect(tDato('region:hungaria', 'Grupo Hungaria')).toBe('Hungaria group');
    // El dato cambió en español: se muestra el español hasta revisar la traducción
    expect(tDato('region:hungaria', 'Región Hungaria')).toBe('Región Hungaria');
    fijarIdioma('es');
    expect(tDato('region:hungaria', 'Grupo Hungaria')).toBe('Grupo Hungaria');
  });

  it('solo se publica un idioma aprobado (con revisor y fecha); en desarrollo, todos', () => {
    const ap = { estado: 'aprobada', revisado_por: 'P', fecha_revision: '2026-10-21' } as const;
    const borr = carpeta({ en: { estado: 'borrador' } }, { 'app.titulo': 'x' });
    expect(idiomasIncluidos(leerRevisiones(borr), false, [], borr)).toEqual([]);
    expect(idiomasIncluidos(leerRevisiones(borr), true, [], borr)).toEqual(['en']);
    expect(idiomasIncluidos(leerRevisiones(borr), false, ['en'], borr)).toEqual(['en']);
    const apr = carpeta({ en: ap }, { 'app.titulo': 'x' });
    expect(idiomasIncluidos(leerRevisiones(apr), false, [], apr)).toEqual(['en']);
    expect(aprobado({ estado: 'aprobada' })).toBe(false);
    // Sin diccionario no hay idioma que publicar
    const sin = carpeta({ en: ap });
    expect(idiomasIncluidos(leerRevisiones(sin), true, [], sin)).toEqual([]);
  });

  it('el build falla si un texto de un idioma en borrador aparece en dist/', () => {
    const i18n = carpeta({ en: { estado: 'borrador' } }, { 'app.subtitulo': LARGO });
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dist, 'assets'));
    writeFileSync(
      join(dist, 'assets', 'en.js'),
      `export const interfaz = ${JSON.stringify({ x: LARGO })};`,
    );
    expect(idiomasBorradorEnDist(dist, i18n).join('\n')).toMatch(/idioma en \(borrador\) aparece/);
    const ap = { estado: 'aprobada', revisado_por: 'P', fecha_revision: '2026-10-21' };
    writeFileSync(join(i18n, 'revision.json'), JSON.stringify({ en: ap }));
    expect(idiomasBorradorEnDist(dist, i18n)).toEqual([]);
  });

  it('los idiomas del proyecto: mismas claves y parámetros; completos y al día si están aprobados', () => {
    const catalogo = JSON.parse(readFileSync('public/data/catalogo.json', 'utf8')) as Catalogo;
    const datosActuales = textosDeDatos(catalogo);
    for (const [codigo, rev] of Object.entries(leerRevisiones())) {
      const r = rutasIdioma(codigo);
      const interfaz = JSON.parse(readFileSync(r.interfaz, 'utf8')) as Record<string, string>;
      for (const [k, v] of Object.entries(interfaz)) {
        expect(es, `${codigo}: clave inexistente ${k}`).toHaveProperty(k);
        expect(parametros(v), `${codigo}: parámetros de ${k}`).toEqual(
          parametros(es[k as keyof typeof es]),
        );
        expect(v, `${codigo}: ${k}`).not.toMatch(/\blive\b|real[- ]time/i);
      }
      if (!aprobado(rev)) continue;
      expect(Object.keys(es).filter((k) => !(k in interfaz))).toEqual([]);
      const datos = JSON.parse(readFileSync(r.datos, 'utf8')) as Record<
        string,
        { es: string; en?: string }
      >;
      const faltan = Object.entries(datosActuales).filter(
        ([k, v]) => datos[k]?.es !== v || !datos[k]?.en,
      );
      expect(faltan.map(([k]) => k)).toEqual([]);
    }
  });
});
