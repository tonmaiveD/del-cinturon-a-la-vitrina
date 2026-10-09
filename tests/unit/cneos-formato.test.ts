import { describe, expect, it } from 'vitest';
import {
  comparacionChelyabinsk,
  cumpleFiltroCneos,
  dosCifras,
  grupoLeyenda,
  rango,
  recientes,
} from '../../src/cneos/formato';
import type { EventoCneos } from '../../src/cneos/eventos';
import { puntosConica, puntosForma } from '../../src/core/muestreo';

describe('formato del modo CNEOS', () => {
  it('dos cifras significativas', () => {
    expect(dosCifras(4410)).toBe('4400');
    expect(dosCifras(23.456)).toBe('23');
    expect(dosCifras(1.234)).toBe('1,2');
    expect(dosCifras(0.0456)).toBe('0,046');
  });

  it('comparación con Chelyabinsk', () => {
    expect(comparacionChelyabinsk(0.44, 440)).toEqual({ factor: '1000', menor: true });
    expect(comparacionChelyabinsk(440, 440)).toBeNull();
  });

  it('rango de percentiles', () => {
    expect(rango([1.7, 1.8, 2.0], 2)).toBe('1,80 (1,70–2,00)');
    expect(rango(null, 2)).toBe('—');
  });

  it('grupos de la leyenda', () => {
    expect(grupoLeyenda({ calidad: 'orbita', orbita: { n: 200 } })).toBe('con-orbita');
    // Elegible pero con el cálculo fallido (o sin calcular): no cuenta como órbita calculada
    expect(grupoLeyenda({ calidad: 'orbita', orbita: { error: 'x' } })).toBe('orbita-fallida');
    expect(grupoLeyenda({ calidad: 'orbita' })).toBe('orbita-fallida');
    expect(grupoLeyenda({ calidad: 'orbita-no-fiable' })).toBe('no-verificable');
    expect(grupoLeyenda({ calidad: 'sin-altura' })).toBe('sin-trayectoria');
    expect(grupoLeyenda({ calidad: 'sin-vector' })).toBe('sin-trayectoria');
  });

  it('filtro y recientes', () => {
    const ev = (fecha: string, kt: number, calidad: EventoCneos['calidad'], lat?: number) =>
      ({ id: fecha, fecha, impacto_kt: kt, energia_radiada_e10j: 1, calidad, lat }) as EventoCneos;
    const lista = [
      ev('2020-01-01T00:00:00Z', 0.1, 'orbita', 1),
      ev('2024-01-01T00:00:00Z', 2, 'sin-vector', 1),
      ev('2025-01-01T00:00:00Z', 2, 'orbita'), // sin ubicación: nunca en el globo
    ];
    const f = { grupo: '' as const, desde: 2021, energiaMin: 1 };
    expect(lista.filter((e) => cumpleFiltroCneos(e, f)).map((e) => e.fecha)).toEqual([
      '2024-01-01T00:00:00Z',
    ]);
    expect(recientes(lista, 2).map((e) => e.fecha.slice(0, 4))).toEqual(['2025', '2024']);
  });
});

describe('cónicas', () => {
  it('la elipse coincide con puntosForma', () => {
    const f = { a: 2, e: 0.5, i: 10, nodo: 30, omega: 40 };
    expect(puntosConica(f, 8).puntos).toEqual(puntosForma(f, 8));
    expect(puntosConica(f, 8).cerrada).toBe(true);
  });

  it('la hipérbola es abierta, pasa por el perihelio y no supera rMax', () => {
    const f = { a: -1.5, e: 1.4, i: 0, nodo: 0, omega: 0 };
    const { puntos, cerrada } = puntosConica(f, 101, 6);
    expect(cerrada).toBe(false);
    const r = puntos.map((p) => Math.hypot(...p));
    expect(Math.max(...r)).toBeLessThanOrEqual(6 + 1e-9);
    expect(Math.min(...r)).toBeCloseTo(f.a * (1 - f.e), 6); // q = a(1 − e)
  });
});
