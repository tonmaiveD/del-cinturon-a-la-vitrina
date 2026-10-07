import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { auditar, type EntradaAuditoria } from '../../pipeline/auditoria';
import { KM_POR_AU } from '../../src/core/marcos';
import { RADIO_VISUAL_METEOROIDE_AU } from '../../src/scene/sistema-solar';
import { Fuentes, Meteorito, RegionEscape, RegionesOrigen } from '../../src/schema';
import type { Catalogo } from '../../src/ui/catalogo';
import type { OrbitaCneos, ResumenCneos } from '../../src/cneos/resumen';
import { CalidadCneos, RespuestaCneos } from '../../src/schema';

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
    bolidos: {
      crudo: RespuestaCneos.parse(leer('data/cneos/eventos.json')),
      resumen: leer<ResumenCneos>('public/data/cneos/eventos.json'),
      tabla4: CalidadCneos.parse(leer('data/calibracion/pena-asensio-2025-tabla4.json')),
      leerOrbita: (id) => leer<OrbitaCneos>(`public/data/cneos/orbitas/${id}.json`),
    },
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

  it('CNEOS: detecta un evento alterado, una fecha de actualización falsa y una σ distinta', () => {
    const e1 = entrada();
    e1.bolidos!.resumen.eventos[0]!.impacto_kt *= 2;
    expect(errores(e1).map((f) => f.elemento)).toEqual([
      'eventos mostrados (fecha, posición, altura, velocidad, energías, calidad)',
    ]);
    const e2 = entrada();
    e2.bolidos!.resumen.consultado = new Date().toISOString();
    expect(errores(e2).map((f) => f.elemento)).toEqual(['fecha de «última actualización»']);
    const e3 = entrada();
    const leerOriginal = e3.bolidos!.leerOrbita;
    e3.bolidos!.leerOrbita = (id) => {
      const o = leerOriginal(id);
      if (!('error' in o)) o.metodo.sigma.v_kms *= 2;
      return o;
    };
    expect(errores(e3).map((f) => f.elemento)).toEqual(['órbitas y nubes calculadas']);
  });

  it('ningún texto de la interfaz dice «en vivo» (los datos del CNEOS no son en tiempo real)', () => {
    for (const [clave, texto] of Object.entries(entrada().textos))
      expect(texto, clave).not.toMatch(/en vivo|live/i);
  });
});
