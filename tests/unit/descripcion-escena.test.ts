import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EventoCneos } from '../../src/cneos/eventos';
import type { Catalogo } from '../../src/ui/catalogo';
import {
  capasLeyenda,
  claveIrAlFinal,
  DIA_MS,
  descripcionVista,
  textoAvisoEscala,
  textoFecha,
  textoLlegada,
  type EstadoDescrito,
} from '../../src/ui/descripcion-escena';

const catalogo = JSON.parse(readFileSync('public/data/catalogo.json', 'utf8')) as Catalogo;
const pieza = (id: string) => catalogo.piezas.find((p) => p.id === id)!;
const bolido = {
  fecha: new Date('2013-02-15T03:20:26Z'),
  alturaKm: 23.3,
  latGrados: 54.8,
  lonGrados: 61.1,
};
const estado = (extra: Partial<EstadoDescrito> = {}): EstadoDescrito => ({
  modo: 'pedigri',
  vista: 'tierra',
  impacto: bolido.fecha.getTime(),
  catalogo,
  pieza: pieza('chelyabinsk'),
  nVisibles: 25,
  bolido,
  nOrbitasChelyabinsk: 300,
  trayPieza: null,
  nClonesSeleccion: 160,
  ...extra,
});

describe('textos de la escena (descripción accesible, fecha, escala, leyenda)', () => {
  it('Chelyabinsk: posición y altura del pico según el CNEOS, con formato local', () => {
    const d = descripcionVista(estado());
    expect(d).toContain('23,3 km');
    expect(d).toContain('54,8° N');
    expect(d).toContain('61,1° E');
    expect(descripcionVista(estado({ vista: 'sistema-solar' }))).toMatch(/300 .*3:1/s);
  });

  it('una pieza con trayectoria de JPL describe su validación (D_D) y su aproximación', () => {
    const p = pieza('almahata-sitta');
    const tray = {
      id: p.id,
      origen: 'jpl' as const,
      punto: { altura_km: 63 },
      validacion: { dd: 0.00028 },
    };
    const base = {
      pieza: p,
      impacto: Date.parse(p.fecha),
      trayPieza: tray,
      metodoNube: 'elementos',
    };
    expect(descripcionVista(estado(base))).toContain('unos 63 km de altura');
    expect(descripcionVista(estado({ ...base, vista: 'sistema-solar' }))).toContain(
      'D_D = 0,00028',
    );
    // Sin trayectoria cargada no promete una estela
    expect(
      descripcionVista(estado({ ...base, trayPieza: null, vista: 'sistema-solar' })),
    ).not.toContain('estela');
  });

  it('fecha relativa: pico de brillo o instante de referencia, en días u horas', () => {
    const e = estado();
    expect(textoFecha(e.impacto, e)).toContain('instante del pico de brillo');
    expect(textoFecha(e.impacto - 2.5 * DIA_MS, e)).toContain('2,5 d antes del pico de brillo');
    const p = pieza('novato');
    const ep = estado({ pieza: p, impacto: Date.parse(p.fecha) });
    expect(textoFecha(ep.impacto - DIA_MS / 4, ep)).toContain('6 h antes del bólido');
    expect(claveIrAlFinal(e)).toBe('tiempo.ir-pico');
    expect(claveIrAlFinal(ep)).toBe('tiempo.ir-referencia');
    expect(claveIrAlFinal({ modo: 'cneos', pieza: p })).toBe('tiempo.ir-pico');
  });

  it('modo CNEOS: describe el bólido seleccionado y la fecha de consulta (nunca «en vivo»)', () => {
    const evento: EventoCneos = {
      id: 'x',
      fecha: '2020-01-01T00:00:00Z',
      energia_radiada_e10j: 1,
      impacto_kt: 0.1,
      lat: 10,
      lon: 20,
      alt_km: 30,
      v_ecef_kms: [1, 2, 3],
      calidad: 'orbita',
    };
    const e = estado({
      modo: 'cneos',
      impacto: Date.parse(evento.fecha),
      cneos: { evento, nVisibles: 888, consultado: '2026-10-17T07:30:00Z', nClones: 0 },
    });
    expect(descripcionVista(e)).toContain('888');
    expect(descripcionVista(e)).not.toMatch(/en vivo/i);
    expect(descripcionVista({ ...e, vista: 'sistema-solar' })).not.toBe(
      descripcionVista({ ...e, vista: 'sistema-solar', cneos: { ...e.cneos!, nClones: 200 } }),
    );
  });

  it('llegada, aviso de escala y leyenda de capas', () => {
    expect(textoLlegada(estado())).not.toBe(
      textoLlegada(estado({ pieza: pieza('novato'), impacto: Date.parse(pieza('novato').fecha) })),
    );
    const ex = { sol: 10, planetas: 1500, jupiter: 150 };
    expect(textoAvisoEscala(false, 'tierra', true, ex)).not.toBe(
      textoAvisoEscala(true, 'tierra', true, ex),
    );
    expect(textoAvisoEscala(true, 'sistema-solar', true, ex)).toContain('1500');
    const claves = (e: Parameters<typeof capasLeyenda>[0], tray: boolean) =>
      capasLeyenda(e, tray).map(([, c]) => c);
    expect(claves(estado(), false)).toContain('capas.chelyabinsk');
    expect(claves(estado({ pieza: pieza('novato') }), false)).not.toContain('capas.estela');
    expect(claves(estado({ pieza: pieza('novato') }), true)).toContain('capas.estela');
    expect(claves(estado({ modo: 'cneos' }), false)).toEqual(['capas.cneos']);
  });
});
