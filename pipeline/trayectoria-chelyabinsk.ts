/**
 * CLI: `npm run datos:trayectoria`.
 * Lo que se dibuja en el recorrido de Chelyabinsk, todo a partir de su órbita principal
 * (Popova et al. 2013), igual que en las demás piezas (decisión del 2026-10-12):
 *
 * - public/data/chelyabinsk-trayectoria.json: trayectoria N cuerpos del año previo, desde el
 *   radiante geocéntrico y v_g de Popova en la posición de referencia de Granvik & Brown (con su
 *   instante), validada contra la órbita de Popova con el criterio de las demás piezas.
 *   Tiempos en días relativos a `instante_referencia`.
 * - public/data/chelyabinsk-orbitas.json: nube de 300 órbitas muestreadas con la σ (1σ) de la
 *   órbita de Popova, elementos independientes, con la misma semilla que el catálogo (las mismas
 *   formas que la nube de la pieza). La anomalía media sale del tiempo de perihelio publicado,
 *   también muestreado, para que la nube de posiciones se mueva con Kepler.
 *
 * El cálculo desde el vector del CNEOS sigue en `npm run validacion:chelyabinsk`, como
 * validación independiente (docs/reportes/chelyabinsk.md); ya no se dibuja en el recorrido.
 */
import * as Astro from 'astronomy-engine';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { crearAzar } from '../src/core/azar';
import { gm } from '../src/core/dinamica';
import { muestrearOrbita, semillaDe, type ElementosPublicados } from '../src/core/muestreo';
import { Meteorito, type Valor } from '../src/schema';
import { calcularPieza } from './trayectorias-pedigri';

export const N_CLONES = 300;
/** Semilla del tiempo de perihelio (las formas usan la del catálogo, `semillaDe(id)`). */
const SEMILLA_PERIHELIO = 20130215;

const m = Meteorito.parse(JSON.parse(readFileSync('data/pedigri/chelyabinsk.json', 'utf8')));
const o = m.orbitas.find((x) => x.fuente === m.orbita_principal);
if (!o?.tiempo_perihelio)
  throw new Error('chelyabinsk: falta la órbita principal con tiempo de perihelio');

// ---------- trayectoria del año previo ----------
const tr = calcularPieza(m);
const v = tr.validacion;
console.log(
  `Trayectoria: D_D ${v.dd} · z(a) ${v.z.a} z(e) ${v.z.e} z(i) ${v.z.i} frente a ${v.fuente_orbita} · ${v.aprobada ? 'aprobada' : 'RECHAZADA'}`,
);
if (!v.aprobada) {
  console.error('Criterio de parada: la trayectoria no reproduce la órbita principal.');
  process.exit(2);
}

// ---------- nube de órbitas ----------
const num = (x: Valor) => x.valor as number;
const ns = (x: Valor) => ({ v: num(x), s: x.sigma });
const publicada: ElementosPublicados = {
  a: ns(o.a),
  e: ns(o.e),
  i: ns(o.i),
  nodo: ns(o.nodo),
  omega: ns(o.omega),
};
/** «2013-02-15.139» (fecha decimal en TT/ET) → días UT desde J2000. */
function diaDecimalUt(texto: string): number {
  const [, a, me, d, f] = /^(\d{4})-(\d{2})-(\d{2})(\.\d+)?/.exec(texto)!;
  const ms = Date.UTC(Number(a), Number(me) - 1, Number(d)) + Number(f ?? 0) * 864e5;
  return Astro.AstroTime.FromTerrestrialTime((ms - Date.UTC(2000, 0, 1, 12)) / 864e5).ut;
}
const epoca = diaDecimalUt(String(o.epoca.valor));
const perihelio = diaDecimalUt(String(o.tiempo_perihelio.valor));
const sigmaPerihelio = o.tiempo_perihelio.sigma ?? 0; // días, 1σ
const MU = gm('Sun');
const GRADOS = 180 / Math.PI;
const anomaliaMedia = (a: number, tp: number) =>
  (((Math.sqrt(MU / a ** 3) * (epoca - tp) * GRADOS) % 360) + 360) % 360;

const azarT = crearAzar(SEMILLA_PERIHELIO);
const formas = muestrearOrbita(publicada, N_CLONES, semillaDe(m.id));
const clones = formas.map((f) => ({
  ...f,
  M: anomaliaMedia(f.a, perihelio + sigmaPerihelio * azarT.normal()),
  epoca_ut_j2000: epoca,
}));
const nominal = {
  a: num(o.a),
  e: num(o.e),
  i: num(o.i),
  nodo: num(o.nodo),
  omega: num(o.omega),
  M: anomaliaMedia(num(o.a), perihelio),
  epoca_ut_j2000: epoca,
};

mkdirSync('public/data', { recursive: true });
writeFileSync(
  'public/data/chelyabinsk-trayectoria.json',
  JSON.stringify({
    ...tr,
    nota: `Radiante y v_g de ${tr.radiante!.fuente}; posición e instante de referencia de ${m.punto_trayectoria!.lat.fuente}, altura convencional. dt en días respecto a instante_referencia.`,
  }) + '\n',
);
writeFileSync(
  'public/data/chelyabinsk-orbitas.json',
  JSON.stringify({
    generado: new Date().toISOString(),
    nota: 'Elementos eclípticos J2000 (grados, AU). Nube muestreada con la incertidumbre 1σ de la órbita principal, elementos independientes (la fuente no publica la covarianza); la anomalía media sale del tiempo de perihelio muestreado. La nominal son los valores centrales publicados.',
    fuente_orbita: o.fuente,
    muestreo: {
      metodo: 'elementos-independientes-1sigma',
      semilla_formas: semillaDe(m.id),
      semilla_perihelio: SEMILLA_PERIHELIO,
    },
    nominal,
    clones,
  }) + '\n',
);
console.log(
  `Nube: ${clones.length} órbitas de ${o.fuente}; trayectoria: ${tr.helio_ecl_au.length} muestras heliocéntricas, ${tr.geo_eqj_km.length} geocéntricas.`,
);
