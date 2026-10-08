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
import { estadoGeocentrico, type RegistroBolido } from '../src/core/orbita-bolido';
import { suma } from '../src/core/vector';
import { trayectoriaHaciaAtras } from './trayectoria-comun';

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

const { helio, geo } = trayectoriaHaciaAtras(t, y0);

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
