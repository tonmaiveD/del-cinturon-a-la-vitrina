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
import * as Astro from 'astronomy-engine';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { derivadaHeliocentrica } from '../src/core/dinamica';
import { integrar } from '../src/core/integrador';
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
  /**
   * `dd-y-z`: D_D ≤ 0,1 y |z| ≤ 3 en a, e, i (general). `solo-dd`: solo D_D ≤ 0,1, cuando la σ
   * formal de la órbita de referencia es menor que la precisión de nuestras efemérides (órbita
   * telescópica de JPL; decisión del usuario del 2026-10-08, opción A).
   */
  criterio: 'dd-y-z' | 'solo-dd';
  aprobada: boolean;
}

export interface TrayectoriaPieza {
  id: string;
  generado: string;
  metodo: string;
  instante_referencia: string;
  /** Origen del estado inicial: radiante publicado o vector de estado de JPL (telescópico). */
  origen: 'radiante' | 'jpl';
  punto: { lat: number; lon: number; altura_km: number; altura_convencional: boolean };
  radiante?: { ra: number; dec: number; vg: number; fuente: string };
  estado_jpl?: { fuente: string; jd_tdb: number; vector_geocentrico: number[] };
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

  const validacion = validar(m, y0, t.ut, t.ut, 'dd-y-z');
  const { helio, geo } = trayectoriaHaciaAtras(t, y0);
  return {
    id: m.id,
    generado: new Date().toISOString(),
    metodo:
      'Estado en la posición de referencia a partir del radiante geocéntrico y v_g (inverso de la atracción cenital); integración N cuerpos hacia atrás con Sol, planetas, Tierra y Luna (astronomy-engine). Sin rozamiento atmosférico.',
    instante_referencia: fecha.toISOString(),
    origen: 'radiante',
    punto: {
      lat: num(pt.lat),
      lon: num(pt.lon),
      altura_km: ALTURA_CONVENCIONAL_KM,
      altura_convencional: true,
    },
    radiante: { ra: num(r.ra), dec: num(r.dec), vg: num(r.v_geocentrica), fuente: r.ra.fuente },
    validacion,
    helio_ecl_au: helio,
    geo_eqj_km: geo,
  };
}

/** Contraste de la órbita que resulta del estado `y` (en `tEstado`) con la órbita principal. */
function validar(
  m: Meteorito,
  y: number[],
  tEstado: number,
  tEpoca: number,
  criterio: Validacion['criterio'],
): Validacion {
  const el = elementosSinTierra(y, tEstado, tEpoca).elementos;
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
    dd <= UMBRAL_DD &&
    (criterio === 'solo-dd' ||
      Object.values(zs).every((x) => x === null || Math.abs(x) <= UMBRAL_Z));
  return { fuente_orbita: o.fuente, dd: Number(dd.toFixed(5)), z: zs, criterio, aprobada };
}

/** Piezas cuya trayectoria parte del vector de estado telescópico de JPL, no del radiante. */
export const DESDE_JPL = new Set(['almahata-sitta']);

/**
 * Estado geocéntrico ICRF de JPL Horizons (data/verificacion/originales.json) → integración
 * hacia adelante hasta el instante de referencia → año previo hacia atrás. La posición final
 * (y su altura) sale del cálculo: no hace falta altura convencional.
 */
export function calcularDesdeJpl(
  m: Meteorito,
  originales: Record<string, unknown>,
): TrayectoriaPieza {
  const o = originales[m.id] as {
    fuente: string;
    vector_geocentrico: {
      jd_tdb: number;
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
    };
  };
  const v = o.vector_geocentrico;
  const tV = Astro.AstroTime.FromTerrestrialTime(v.jd_tdb - 2451545.0);
  const T = Astro.HelioState(Astro.Body.Earth, tV);
  const y0 = [v.x + T.x, v.y + T.y, v.z + T.z, v.vx + T.vx, v.vy + T.vy, v.vz + T.vz];
  const fecha = new Date(String(m.fecha_caida.valor));
  const tRef = Astro.MakeTime(fecha);
  const yRef = Array.from(
    integrar(derivadaHeliocentrica(), tV.ut, y0, tRef.ut, {
      rtol: 1e-12,
      atol: 1e-16,
      h0: 1e-6,
    }).y,
  );
  const validacion = validar(m, y0, tV.ut, tRef.ut, 'solo-dd');
  // Posición geodésica en el instante de referencia (vector geocéntrico EQJ en AU)
  const Te = Astro.HelioVector(Astro.Body.Earth, tRef);
  const obs = Astro.VectorObserver(
    new Astro.Vector(yRef[0]! - Te.x, yRef[1]! - Te.y, yRef[2]! - Te.z, tRef),
    false,
  );
  const { helio, geo } = trayectoriaHaciaAtras(tRef, yRef);
  return {
    id: m.id,
    generado: new Date().toISOString(),
    metodo:
      'Vector de estado geocéntrico de JPL Horizons (órbita telescópica previa al impacto) integrado con N cuerpos hasta el instante de referencia y, desde ahí, 365 días hacia atrás con Sol, planetas, Tierra y Luna (astronomy-engine). Sin rozamiento atmosférico.',
    instante_referencia: fecha.toISOString(),
    origen: 'jpl',
    punto: {
      lat: Number(obs.latitude.toFixed(3)),
      lon: Number(obs.longitude.toFixed(3)),
      altura_km: Math.round(obs.height / 1000),
      altura_convencional: false,
    },
    estado_jpl: {
      fuente: o.fuente,
      jd_tdb: v.jd_tdb,
      vector_geocentrico: [v.x, v.y, v.z, v.vx, v.vy, v.vz],
    },
    validacion,
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
    '| Pieza | Lote | Origen | Órbita de referencia | Criterio | D_D | z(a) | z(e) | z(i) | Aprobada |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...filas
      .sort((x, y) => lote(x.id).localeCompare(lote(y.id)) || x.id.localeCompare(y.id))
      .map(
        (t) =>
          `| ${t.id} | ${lote(t.id)} | ${t.origen === 'jpl' ? 'vector de JPL' : 'radiante'} | ${t.validacion.fuente_orbita} | ${t.validacion.criterio === 'solo-dd' ? 'solo D_D' : 'D_D y z'} | ${t.validacion.dd.toFixed(4)} | ${f(t.validacion.z.a)} | ${f(t.validacion.z.e)} | ${f(t.validacion.z.i)} | ${t.validacion.aprobada ? 'sí' : '**no**'} |`,
      ),
    '',
    '**Almahata Sitta (2008 TC3)** parte del vector de estado geocéntrico de JPL Horizons, obtenido con observaciones telescópicas antes del impacto, y no del radiante. Se valida solo con D_D (decisión del 2026-10-08): la σ formal de la órbita de JPL (~1e-6) es menor que la precisión de las efemérides de astronomy-engine (su Tierra difiere ~1100 km de la de JPL), por lo que |z| > 3 no indica una discrepancia física. Es el mismo cálculo aceptado en la Fase 2 (docs/reportes/cruzada.md, §B). El criterio se explica en la descripción de la escena.',
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
    const tr = DESDE_JPL.has(id)
      ? calcularDesdeJpl(m, JSON.parse(readFileSync('data/verificacion/originales.json', 'utf8')))
      : calcularPieza(m);
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
