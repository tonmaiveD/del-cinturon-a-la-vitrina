import { readFileSync } from 'node:fs';
import * as Astro from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import {
  ALTURA_CONVENCIONAL_KM,
  LOTES,
  type TrayectoriaPieza,
} from '../../pipeline/trayectorias-pedigri';
import { eqjAEcef, estadoPuntoTerrestre, KM_POR_AU } from '../../src/core/marcos';

const leer = <T>(r: string) => JSON.parse(readFileSync(r, 'utf8')) as T;
const indice = leer<{ piezas: string[] }>('public/data/trayectorias/indice.json').piezas;

describe('trayectorias animadas de las piezas con pedigrí', () => {
  it('los lotes no se solapan y cubren las 24 piezas distintas de Chelyabinsk', () => {
    const todas = Object.values(LOTES).flat();
    expect(new Set(todas).size).toBe(todas.length);
    expect(todas).toHaveLength(24);
    expect(todas).not.toContain('chelyabinsk');
  });

  it.each(indice)('%s: año previo completo y llegada a la posición de referencia', (id) => {
    const tr = leer<TrayectoriaPieza>(`public/data/trayectorias/${id}.json`);
    expect(tr.validacion.aprobada).toBe(true);
    expect(tr.punto.altura_km).toBe(ALTURA_CONVENCIONAL_KM);
    // Heliocéntrica: de −365 días a 0
    expect(tr.helio_ecl_au[0]![0]).toBeCloseTo(-365, 3);
    expect(tr.helio_ecl_au.at(-1)![0]).toBe(0);
    // Geocéntrica: el último punto es la posición de referencia (EQJ, km)
    const ultimo = tr.geo_eqj_km.at(-1)!;
    expect(ultimo[0]).toBe(0);
    const t = Astro.MakeTime(new Date(tr.instante_referencia));
    const ref = estadoPuntoTerrestre(tr.punto.lat, tr.punto.lon, tr.punto.altura_km * 1000, t).r;
    const d = Math.hypot(
      ultimo[1]! - ref[0] * KM_POR_AU,
      ultimo[2]! - ref[1] * KM_POR_AU,
      ultimo[3]! - ref[2] * KM_POR_AU,
    );
    expect(d).toBeLessThan(1); // km
    // Comprobación del marco: la misma posición en ECEF está a ~100 km sobre el elipsoide
    const ecef = eqjAEcef(ref, t).map((c) => c * KM_POR_AU);
    expect(Math.hypot(...ecef)).toBeGreaterThan(6356 + 90);
  });
});
