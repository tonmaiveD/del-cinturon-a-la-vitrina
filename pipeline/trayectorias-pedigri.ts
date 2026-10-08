/**
 * CLI: `npm run datos:trayectorias -- <lote>` (a, b o c).
 * Trayectoria N cuerpos del año previo al impacto de cada pieza con pedigrí, a partir de su
 * radiante geocéntrico, v_g, instante y posición de referencia publicados (Granvik & Brown 2018).
 * La fuente no publica la altura de la posición de referencia: se usa una altura convencional
 * de ALTURA_CONVENCIONAL_KM, declarada en el archivo y en la interfaz (decisión del 2026-10-08).
 *
 * Criterio de parada: la órbita que resulta de ese estado se contrasta con la órbita principal
 * publicada de la pieza; si D_D > 0,1 o algún elemento a, e, i se aparta más de 3σ, no se guarda
 * la trayectoria de esa pieza y el proceso termina con error para revisarlo.
 *
 * Salidas: public/data/trayectorias/<id>.json, public/data/trayectorias/indice.json y
 * docs/reportes/trayectorias.md.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { elementosSinTierra, estadoDesdeRadianteGeocentrico } from '../src/core/orbita-bolido';
import { dDrummond } from '../src/core/similitud';
import { GRAD } from '../src/core/vector';
import { Meteorito, type Orbita, type Valor } from '../src/schema';
import { trayectoriaHaciaAtras } from './trayectoria-comun';

export const ALTURA_CONVENCIONAL_KM = 100;
const UMBRAL_DD = 0.1;
const UMBRAL_Z = 3;
const DIR = 'public/data/trayectorias';

/** Lotes acordados con el usuario (Chelyabinsk ya tiene su trayectoria desde el CNEOS). */
export const LOTES: Record<string, string[]> = {
  a: [
    'pribram',
    'lost-city',
    'innisfree',
    'benesov',
    'peekskill',
    'tagish-lake',
    'moravka',
    'neuschwanstein',
    'park-forest',
    'villalbeto-de-la-pena',
  ],
  b: [
    'bunburra-rockhole',
    'buzzard-coulee',
    'maribo',
    'jesenice',
    'grimsby',
    'kosice',
    'mason-gully',
    'krizevci',
    'sutters-mill',
    'novato',
  ],
  c: ['almahata-sitta', 'annama', 'zdar-nad-sazavou', 'ejby'],
};

export interface Validacion {
  fuente_orbita: string;
  dd: number;
  z: { a: number | null; e: number | null; i: number | null };
  aprobada: boolean;
}

export interface TrayectoriaPieza {
  id: string;
  generado: string;
  metodo: string;
  instante_referencia: string;
  punto: { lat: number; lon: number; altura_km: number; altura_convencional: true };
  radiante: { ra: number; dec: number; vg: number; fuente: string };
  validacion: Validacion;
  helio_ecl_au: number[][];
  geo_eqj_km: number[][];
}

const num = (v: Valor) => v.valor as number;
const verificado = (v: Valor | undefined): v is Valor => v?.estado === 'verificado';

function principal(m: Meteorito): Orbita {
  const o = m.orbitas.find((x) => x.fuente === (m.orbita_principal ?? 'granvik-brown-2018'));
  if (!o) throw new Error(`${m.id}: sin órbita principal`);
  return o;
}

export function calcularPieza(m: Meteorito): TrayectoriaPieza {
  const r = m.radiante_geocentrico;
  const pt = m.punto_trayectoria;
  if (!r || !pt || ![r.ra, r.dec, r.v_geocentrica, pt.lat, pt.lon].every(verificado))
    throw new Error(`${m.id}: faltan radiante, v_g o posición de referencia verificados`);
  const fecha = new Date(String(m.fecha_caida.valor));
  const { t, y0 } = estadoDesdeRadianteGeocentrico({
    fecha,
    latGrados: num(pt.lat),
    lonGrados: num(pt.lon),
    alturaKm: ALTURA_CONVENCIONAL_KM,
    raGrados: num(r.ra),
    decGrados: num(r.dec),
    vgKmS: num(r.v_geocentrica),
  });

  // Validación frente a la órbita principal publicada
  const el = elementosSinTierra(y0, t.ut, t.ut).elementos;
  const o = principal(m);
  const ang = {
    q: num(o.a) * (1 - num(o.e)),
    e: num(o.e),
    i: num(o.i) * GRAD,
    nodo: num(o.nodo) * GRAD,
    omega: num(o.omega) * GRAD,
  };
  const dd = dDrummond(
    { q: el.a * (1 - el.e), e: el.e, i: el.i, nodo: el.nodo, omega: el.omega },
    ang,
  );
  const z = (calc: number, v: Valor) =>
    v.sigma ? Number(((calc - num(v)) / v.sigma).toFixed(2)) : null;
  const zs = { a: z(el.a, o.a), e: z(el.e, o.e), i: z(el.i / GRAD, o.i) };
  const aprobada =
    dd <= UMBRAL_DD && Object.values(zs).every((x) => x === null || Math.abs(x) <= UMBRAL_Z);

  const { helio, geo } = trayectoriaHaciaAtras(t, y0);
  return {
    id: m.id,
    generado: new Date().toISOString(),
    metodo:
      'Estado en la posición de referencia a partir del radiante geocéntrico y v_g (inverso de la atracción cenital); integración N cuerpos hacia atrás con Sol, planetas, Tierra y Luna (astronomy-engine). Sin rozamiento atmosférico.',
    instante_referencia: fecha.toISOString(),
    punto: {
      lat: num(pt.lat),
      lon: num(pt.lon),
      altura_km: ALTURA_CONVENCIONAL_KM,
      altura_convencional: true,
    },
    radiante: { ra: num(r.ra), dec: num(r.dec), vg: num(r.v_geocentrica), fuente: r.ra.fuente },
    validacion: { fuente_orbita: o.fuente, dd: Number(dd.toFixed(4)), z: zs, aprobada },
    helio_ecl_au: helio,
    geo_eqj_km: geo,
  };
}

function informe(): string {
  const filas = readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && f !== 'indice.json')
    .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as TrayectoriaPieza);
  const lote = (id: string) =>
    Object.entries(LOTES).find(([, ids]) => ids.includes(id))?.[0] ?? '—';
  const f = (x: number | null) => (x === null ? '—' : x.toFixed(2));
  return [
    '# Trayectorias animadas de las piezas con pedigrí',
    '',
    'Generado por `npm run datos:trayectorias`. Cada trayectoria parte del radiante geocéntrico, v_g, instante y posición de referencia publicados (Granvik & Brown 2018) con una **altura convencional de ' +
      `${ALTURA_CONVENCIONAL_KM} km** (la fuente no publica la altura) y se integra con N cuerpos hacia atrás 365 días. Antes de guardarla, la órbita resultante se contrasta con la órbita principal publicada (criterio de parada: D_D > ${UMBRAL_DD} o |z| > ${UMBRAL_Z} en a, e o i). Chelyabinsk tiene su propia trayectoria, calculada desde el vector del CNEOS (Fase 1).`,
    '',
    '| Pieza | Lote | Órbita de referencia | D_D | z(a) | z(e) | z(i) | Aprobada |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...filas
      .sort((x, y) => lote(x.id).localeCompare(lote(y.id)) || x.id.localeCompare(y.id))
      .map(
        (t) =>
          `| ${t.id} | ${lote(t.id)} | ${t.validacion.fuente_orbita} | ${t.validacion.dd.toFixed(4)} | ${f(t.validacion.z.a)} | ${f(t.validacion.z.e)} | ${f(t.validacion.z.i)} | ${t.validacion.aprobada ? 'sí' : '**no**'} |`,
      ),
    '',
  ].join('\n');
}

// ---------- CLI ----------
if (process.argv[1]?.endsWith('trayectorias-pedigri.ts')) {
  const lote = process.argv[2]?.toLowerCase();
  if (!lote || !LOTES[lote]) {
    console.error(`Uso: npm run datos:trayectorias -- <${Object.keys(LOTES).join('|')}>`);
    process.exit(2);
  }
  mkdirSync(DIR, { recursive: true });
  const rechazadas: string[] = [];
  for (const id of LOTES[lote]!) {
    const m = Meteorito.parse(JSON.parse(readFileSync(`data/pedigri/${id}.json`, 'utf8')));
    const tr = calcularPieza(m);
    const v = tr.validacion;
    console.log(
      `${id}: D_D ${v.dd} · z(a) ${v.z.a} z(e) ${v.z.e} z(i) ${v.z.i} · ${tr.helio_ecl_au.length} muestras · ${v.aprobada ? 'aprobada' : 'RECHAZADA'}`,
    );
    if (v.aprobada) writeFileSync(`${DIR}/${id}.json`, JSON.stringify(tr));
    else rechazadas.push(id);
  }
  const ids = readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && f !== 'indice.json')
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  writeFileSync(`${DIR}/indice.json`, JSON.stringify({ piezas: ids }));
  writeFileSync('docs/reportes/trayectorias.md', informe());
  if (rechazadas.length) {
    console.error(`Criterio de parada: ${rechazadas.join(', ')} (no se guardaron).`);
    process.exit(1);
  }
  if (!existsSync(`${DIR}/indice.json`)) process.exit(1);
}
