/**
 * CLI: `npm run datos:trayectoria`.
 * Trayectoria N-cuerpos (Sol, planetas, Tierra, Luna) de la órbita nominal de Chelyabinsk,
 * integrada hacia atrás desde el pico de brillo durante DIAS días. Se guarda cada paso aceptado
 * del integrador (adaptativo: denso cerca de la Tierra). Salida: public/data/chelyabinsk-trayectoria.json
 *   - helio: posiciones heliocéntricas eclípticas J2000 (AU)
 *   - geo: posiciones geocéntricas EQJ (km) de los últimos DIAS_GEO días
 * Tiempos en días relativos al pico de brillo (negativos = antes).
 */
import * as Astro from 'astronomy-engine';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { derivadaHeliocentrica } from '../src/core/dinamica';
import { integrar } from '../src/core/integrador';
import { eqjAEcl, KM_POR_AU } from '../src/core/marcos';
import { estadoGeocentrico, type RegistroBolido } from '../src/core/orbita-bolido';
import { suma, type Vec3 } from '../src/core/vector';

const DIAS = 365;
const DIAS_GEO = 3;
const PASO_MAX = 0.5; // días: limita huecos en la animación

const cneos = JSON.parse(readFileSync('data/cneos/chelyabinsk.json', 'utf8'));
const campos = cneos.respuesta.fields as string[];
const fila = cneos.respuesta.data[0] as string[];
const c = (k: string) => fila[campos.indexOf(k)]!;
const signo = (v: string, dir: string, neg: string) => (dir === neg ? -1 : 1) * Number(v);
const registro: RegistroBolido = {
  fecha: new Date(c('date').replace(' ', 'T') + 'Z'),
  latGrados: signo(c('lat'), c('lat-dir'), 'S'),
  lonGrados: signo(c('lon'), c('lon-dir'), 'W'),
  alturaKm: Number(c('alt')),
  vEcefKmS: [Number(c('vx')), Number(c('vy')), Number(c('vz'))],
};

const { t, r, v } = estadoGeocentrico(registro, 'ecef-relativa');
const tierra = Astro.HelioState(Astro.Body.Earth, t);
const y0 = [
  ...suma([tierra.x, tierra.y, tierra.z], r),
  ...suma([tierra.vx, tierra.vy, tierra.vz], v),
];

const muestras: { dt: number; y: Float64Array }[] = [{ dt: 0, y: Float64Array.from(y0) }];
integrar(derivadaHeliocentrica(), t.ut, y0, t.ut - DIAS, {
  rtol: 1e-11,
  atol: 1e-16,
  h0: 1e-7,
  hMax: PASO_MAX,
  alPaso: (tt, y) => {
    muestras.push({ dt: tt - t.ut, y: Float64Array.from(y) });
  },
});
muestras.reverse();

const redondear = (x: number, d: number) => Number(x.toFixed(d));
const helio = muestras.map(({ dt, y }) => {
  const p = eqjAEcl([y[0]!, y[1]!, y[2]!]);
  return [redondear(dt, 7), redondear(p[0], 8), redondear(p[1], 8), redondear(p[2], 8)];
});
const geo = muestras
  .filter(({ dt }) => dt >= -DIAS_GEO)
  .map(({ dt, y }) => {
    const e = Astro.HelioVector(Astro.Body.Earth, t.AddDays(dt));
    const g: Vec3 = [
      (y[0]! - e.x) * KM_POR_AU,
      (y[1]! - e.y) * KM_POR_AU,
      (y[2]! - e.z) * KM_POR_AU,
    ];
    return [redondear(dt, 9), redondear(g[0], 2), redondear(g[1], 2), redondear(g[2], 2)];
  });

mkdirSync('public/data', { recursive: true });
writeFileSync(
  'public/data/chelyabinsk-trayectoria.json',
  JSON.stringify({
    generado: new Date().toISOString(),
    nota: 'Trayectoria nominal (sin perturbar) integrada hacia atrás desde el pico de brillo CNEOS con Sol, planetas, Tierra y Luna (astronomy-engine). Sin rozamiento atmosférico. dt en días respecto al pico.',
    instante_pico: registro.fecha.toISOString(),
    helio_ecl_au: helio,
    geo_eqj_km: geo,
  }) + '\n',
);
console.log(`Trayectoria: ${helio.length} muestras heliocéntricas, ${geo.length} geocéntricas.`);
