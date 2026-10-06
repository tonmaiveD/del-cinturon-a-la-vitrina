import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { auditar, type EntradaAuditoria } from '../../pipeline/auditoria';
import { KM_POR_AU } from '../../src/core/marcos';
import { RADIO_VISUAL_METEOROIDE_AU } from '../../src/scene/sistema-solar';
import { Fuentes, Meteorito, RegionEscape, RegionesOrigen } from '../../src/schema';
import type { Catalogo } from '../../src/ui/catalogo';

const leer = <T = unknown>(r: string): T => JSON.parse(readFileSync(r, 'utf8')) as T;
const entrada = (): EntradaAuditoria => {
  const cneos = leer<EntradaAuditoria['cneos']>('data/cneos/chelyabinsk.json');
  return {
    fuentes: Fuentes.parse(leer('data/fuentes.json')),
    meteoritos: readdirSync('data/pedigri')
      .filter((f) => f.endsWith('.json'))
      .map((f) => Meteorito.parse(leer(`data/pedigri/${f}`))),
    regiones: RegionesOrigen.parse(leer('data/regiones-origen.json')),
    escape: RegionEscape.array().parse(leer('data/regiones-escape.json')),
    catalogo: leer<Catalogo>('public/data/catalogo.json'),
    textos: leer('src/i18n/es.json'),
    ficha: {
      cruda: readFileSync('content/fichas/chelyabinsk.md', 'utf8'),
      cneos,
      nClones: 300,
    },
    cneos,
    radioVisualMeteoroideKm: RADIO_VISUAL_METEOROIDE_AU * KM_POR_AU,
  };
};
const errores = (e: EntradaAuditoria) => auditar(e).filter((f) => f.estado === 'error');
const pieza = (e: EntradaAuditoria, id: string) => e.catalogo.piezas.find((p) => p.id === id)!;

describe('auditoría de trazabilidad', () => {
  it('el estado actual del proyecto no tiene errores', () => {
    expect(errores(entrada())).toEqual([]);
  });

  it('detecta un valor mostrado distinto del dataset', () => {
    const e = entrada();
    pieza(e, 'park-forest').orbita!.a.v += 0.01;
    expect(errores(e).map((f) => f.elemento)).toEqual(['órbita: a']);
  });

  it('detecta una incertidumbre mostrada distinta de la publicada', () => {
    const e = entrada();
    pieza(e, 'zdar-nad-sazavou').escape[0]!.regiones[0]!.sigma = 0;
    expect(errores(e)).toHaveLength(1);
  });

  it('detecta un dato pendiente mostrado como firme', () => {
    const e = entrada();
    pieza(e, 'annama').nombre.verificado = true;
    expect(errores(e).map((f) => f.elemento)).toEqual(['nombre']);
    const e2 = entrada();
    e2.meteoritos.find((m) => m.id === 'annama')!.clase.estado = 'pendiente';
    expect(errores(e2).map((f) => f.elemento)).toEqual(['clase']);
  });

  it('detecta cifras escritas a mano en los textos de la interfaz', () => {
    const e = entrada();
    e.textos['narr.final'] = 'Pico de brillo sobre los Urales, 15 de febrero de 2013.';
    expect(errores(e).map((f) => f.elemento)).toEqual(['narr.final']);
  });

  it('detecta una asociación con progenitor alterada', () => {
    const e = entrada();
    const a = pieza(e, 'chelyabinsk').asociacion;
    if ('confianza' in a) a.confianza = 'alto';
    expect(errores(e).map((f) => f.elemento)).toEqual(['asociación con progenitor']);
  });
});
