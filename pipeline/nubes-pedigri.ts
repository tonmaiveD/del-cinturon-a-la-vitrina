/**
 * CLI: `npm run datos:nubes [-- id…]` (sin ids, las 25 piezas).
 *
 * Nubes de órbitas posibles de las piezas con pedigrí (decisión del 2026-10-12, tras la
 * auditoría de la ficha de Chelyabinsk). Sortear cada elemento orbital por separado producía
 * órbitas que no pasan por la Tierra (en Chelyabinsk, solo el 6 % a menos de 0,002 au). Ahora
 * la nube se construye como la estela: se sortean el radiante geocéntrico (α_g, δ_g) y v_g
 * publicados, con su σ a 1σ, y cada clon se integra con N cuerpos desde la posición e instante
 * de referencia (`nubeDesdeRadiante`). Así todas las órbitas pasan por la Tierra en ese instante.
 * Almahata Sitta conserva el sorteo de su órbita telescópica de JPL, cuya σ es tan pequeña que
 * todas sus órbitas ya pasan por la Tierra.
 *
 * Criterio de parada por pieza: el radiante central reproduce la órbita principal (D_D ≤ 0,1),
 * todas las órbitas pasan a menos de 0,002 au de la Tierra y se descarta como mucho el 10 %.
 *
 * Chelyabinsk (opción C, decisión del usuario del 2026-10-12) sortea los elementos publicados y
 * conserva las órbitas que chocan con la Tierra en la aproximación de dos cuerpos: parámetro de
 * impacto ≤ radio de captura (`src/core/encuentro.ts`; auditoría V5). Hasta entonces se exigía
 * una distancia geométrica < 15 000 km, que medía otra cosa y dejaba pasar órbitas sin choque.
 *
 * Salidas:
 * - public/data/nubes.json: 160 formas por pieza (las que dibuja el catálogo);
 * - public/data/chelyabinsk-orbitas.json: 300 órbitas completas para el recorrido (las 160
 *   primeras son las del catálogo), con la órbita central publicada como línea;
 * - docs/reportes/nubes.md: validación y comparación de la dispersión con la σ publicada.
 */
import * as Astro from 'astronomy-engine';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gm } from '../src/core/dinamica';
import { estadoDesdeElementos, type Elementos } from '../src/core/kepler';
import { eqjAEcl, KM_POR_AU } from '../src/core/marcos';
import { nubeDesdeRadiante, orbitaDeRadiante } from '../src/core/montecarlo';
import { crearAzar } from '../src/core/azar';
import { muestrearOrbita, puntosForma, semillaDe, type FormaOrbita } from '../src/core/muestreo';
import { dDrummond } from '../src/core/similitud';
import { GRAD, type Vec3 } from '../src/core/vector';
import { Meteorito, type Orbita, type Valor } from '../src/schema';
import type { Catalogo, FormaNube, NubePieza, NubesPedigri } from '../src/ui/catalogo';
import {
  ALTURA_ATMOSFERA_KM,
  instanteMaximaAproximacion,
  parametroImpacto,
  RADIO_TIERRA_KM,
  radioCaptura,
} from '../src/core/encuentro';
import { procedenciaReporte } from './huella-metodo';
import { DESDE_JPL, entradaPieza, registroDesdeRadianteAparente } from './trayectorias-pedigri';
import { orbitaDesdeBolido } from '../src/core/orbita-bolido';

export const N_NUBE = 160;
export const N_CHELYABINSK = 300;
export const UMBRAL_DIST_AU = 0.002;
const UMBRAL_DD = 0.1;
const MAX_DESCARTADOS = 0.1;
const SALIDA = 'public/data/nubes.json';
/**
 * Piezas cuya nube sale de los elementos publicados condicionados al encuentro con la Tierra
 * (decisión del usuario del 2026-10-12, opción C): en Chelyabinsk, los márgenes del radiante
 * geocéntrico de Popova et al. son mucho más anchos de lo que implica su radiante aparente y no
 * reproducen los de su órbita, que obtuvieron con un Monte Carlo (docs/reportes/nubes.md).
 */
export const CONDICIONADAS = new Set(['chelyabinsk']);
/** Cómo se decide que una órbita sorteada choca con la Tierra en el instante de entrada. */
export type CriterioEncuentro =
  | { tipo: 'parametro-impacto'; alturaAtmosferaKm: number }
  | { tipo: 'distancia'; umbralKm: number };
/**
 * Criterio vigente (auditoría V5, 2026-10-12): parámetro de impacto ≤ radio de captura de cada
 * clon, con la altura de atmósfera como parámetro.
 */
export const CRITERIO_ENCUENTRO: CriterioEncuentro = {
  tipo: 'parametro-impacto',
  alturaAtmosferaKm: ALTURA_ATMOSFERA_KM,
};
/** Criterio anterior (distancia geométrica < 15 000 km), solo para la comparación del reporte. */
export const CRITERIO_ANTERIOR: CriterioEncuentro = { tipo: 'distancia', umbralKm: 15000 };
const MU = gm('Sun');
const SEG_POR_DIA = 86400;

const leer = <T>(r: string) => JSON.parse(readFileSync(r, 'utf8')) as T;
const num = (v: Valor) => v.valor as number;
const red = (x: number, d: number) => Number(x.toFixed(d));
const formaDe = (f: FormaOrbita): FormaNube => [
  red(f.a, 6),
  red(f.e, 6),
  red(f.i, 4),
  red(f.nodo, 4),
  red(f.omega, 4),
];
const formaDeElementos = (el: Elementos): FormaOrbita => ({
  a: el.a,
  e: el.e,
  i: el.i / GRAD,
  nodo: el.nodo / GRAD,
  omega: el.omega / GRAD,
});

function tierraEcl(t: Astro.AstroTime): Vec3 {
  const v = Astro.HelioVector(Astro.Body.Earth, t);
  return eqjAEcl([v.x, v.y, v.z]);
}
/** Posición (au) y velocidad (au/día) heliocéntricas de la Tierra en la eclíptica J2000. */
function tierraEstadoEcl(t: Astro.AstroTime): { r: Vec3; v: Vec3 } {
  const s = Astro.HelioState(Astro.Body.Earth, t);
  return { r: eqjAEcl([s.x, s.y, s.z]), v: eqjAEcl([s.vx, s.vy, s.vz]) };
}

/** Encuentro de una órbita (en su posición en t) con la Tierra, en la aproximación de dos cuerpos. */
export interface Encuentro {
  /** Distancia geométrica a la Tierra en el instante (km). */
  distanciaKm: number;
  /** Parámetro de impacto (km). */
  bKm: number;
  /** Velocidad relativa a la Tierra, sin su atracción (km/s). */
  vgKmS: number;
  /** Radio de captura para esa velocidad (km). */
  radioCapturaKm: number;
  /** Minutos entre el instante y la máxima aproximación de la trayectoria relativa recta. */
  desfaseMin: number;
}

/** Encuentro con la Tierra de unos elementos (radianes, época t) en el instante t. */
export function encuentroCon(
  el: Elementos,
  t: Astro.AstroTime,
  alturaAtmosferaKm = ALTURA_ATMOSFERA_KM,
): Encuentro {
  const s = estadoDesdeElementos(el, MU, t.ut);
  const T = tierraEstadoEcl(t);
  const r: Vec3 = [s.r[0] - T.r[0], s.r[1] - T.r[1], s.r[2] - T.r[2]];
  const v: Vec3 = [s.v[0] - T.v[0], s.v[1] - T.v[1], s.v[2] - T.v[2]];
  const vgKmS = (Math.hypot(...v) * KM_POR_AU) / SEG_POR_DIA;
  return {
    distanciaKm: Math.hypot(...r) * KM_POR_AU,
    bKm: parametroImpacto(r, v) * KM_POR_AU,
    vgKmS,
    radioCapturaKm: radioCaptura(vgKmS, RADIO_TIERRA_KM + alturaAtmosferaKm),
    desfaseMin: instanteMaximaAproximacion(r, v) * 1440,
  };
}

/** ¿Cumple el encuentro el criterio? */
export function cumpleCriterio(x: Encuentro, criterio: CriterioEncuentro): boolean {
  return criterio.tipo === 'parametro-impacto'
    ? x.bKm <= x.radioCapturaKm
    : x.distanciaKm < criterio.umbralKm;
}

/** Mínimo, mediana y máximo, redondeados. */
function rango(xs: number[], d = 0) {
  return {
    min: red(Math.min(...xs), d),
    mediana: red(mediana(xs), d),
    max: red(Math.max(...xs), d),
  };
}
const distancia = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
function desviacion(xs: number[]): number {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

export function orbitaPrincipal(m: Meteorito): Orbita {
  const o = m.orbitas.find((x) => x.fuente === (m.orbita_principal ?? 'granvik-brown-2018'));
  if (!o) throw new Error(`${m.id}: sin órbita principal`);
  return o;
}

interface Calculo {
  nube: NubePieza;
  /** Órbitas completas (con anomalía media), solo para el recorrido de Chelyabinsk. */
  completas?: Elementos[];
  /** σ de la nube frente a la σ publicada (1σ) de la órbita principal. */
  sigmas: Record<'a' | 'e' | 'i' | 'q', { nube: number; publicada: number | undefined }>;
  /** Valores centrales publicados de la órbita principal con su σ (1σ). */
  publicada: Partial<Record<'a' | 'e' | 'i' | 'q', { v: number; s?: number }>>;
  /** Línea central del recorrido (solo `elementos-condicionados`). */
  nominal?: ReturnType<typeof nubeCondicionada>['nominal'];
}

const CLAVES = ['a', 'e', 'i', 'q'] as const;
const valorDe = (x: FormaOrbita, k: (typeof CLAVES)[number]) =>
  k === 'q' ? x.a * (1 - x.e) : x[k];
function resumen(formas: FormaOrbita[]): NubePieza['resumen'] {
  return Object.fromEntries(
    CLAVES.map((k) => {
      const xs = formas.map((x) => valorDe(x, k));
      return [k, { mediana: red(mediana(xs), 6), sigma: red(desviacion(xs), 6) }];
    }),
  ) as NubePieza['resumen'];
}

function publicadaDe(o: Orbita): Calculo['publicada'] {
  const vs = (x?: Valor) => x && { v: num(x), s: x.sigma };
  return { a: vs(o.a), e: vs(o.e), i: vs(o.i), q: vs(o.q) };
}

function sigmas(formas: FormaOrbita[], o: Orbita): Calculo['sigmas'] {
  const col = (f: (x: FormaOrbita) => number) => desviacion(formas.map(f));
  return {
    a: { nube: col((x) => x.a), publicada: o.a.sigma },
    e: { nube: col((x) => x.e), publicada: o.e.sigma },
    i: { nube: col((x) => x.i), publicada: o.i.sigma },
    q: { nube: col((x) => x.a * (1 - x.e)), publicada: o.q?.sigma },
  };
}

/** Posición (eclíptica, au) del punto de anomalía excéntrica E de una órbita elíptica. */
function posicionEnE(f: FormaOrbita, E: number): Vec3 {
  const [cO, sO] = [Math.cos(f.nodo * GRAD), Math.sin(f.nodo * GRAD)];
  const [cw, sw] = [Math.cos(f.omega * GRAD), Math.sin(f.omega * GRAD)];
  const [ci, si] = [Math.cos(f.i * GRAD), Math.sin(f.i * GRAD)];
  const X = f.a * (Math.cos(E) - f.e);
  const Y = f.a * Math.sqrt(1 - f.e * f.e) * Math.sin(E);
  return [
    (cO * cw - sO * sw * ci) * X + (-cO * sw - sO * cw * ci) * Y,
    (sO * cw + cO * sw * ci) * X + (-sO * sw + cO * cw * ci) * Y,
    sw * si * X + cw * si * Y,
  ];
}

/** Distancia mínima (au) entre una elipse y un punto, y la anomalía excéntrica donde se da. */
export function distanciaMinima(f: FormaOrbita, T: Vec3): { d: number; E: number } {
  const N = 1440;
  let mejor = 0;
  let dMejor = Infinity;
  for (let k = 0; k < N; k++) {
    const d = distancia(posicionEnE(f, (2 * Math.PI * k) / N), T);
    if (d < dMejor) [dMejor, mejor] = [d, k];
  }
  // Sección áurea alrededor del mínimo de la malla
  let [lo, hi] = [(2 * Math.PI * (mejor - 1)) / N, (2 * Math.PI * (mejor + 1)) / N];
  const g = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 80; k++) {
    const x1 = hi - g * (hi - lo);
    const x2 = lo + g * (hi - lo);
    if (distancia(posicionEnE(f, x1), T) < distancia(posicionEnE(f, x2), T)) hi = x2;
    else lo = x1;
  }
  const E = (lo + hi) / 2;
  return { d: distancia(posicionEnE(f, E), T), E };
}

/** Elementos (radianes) de una forma colocada en el punto de anomalía excéntrica E en la época t. */
function elementosEnE(f: FormaOrbita, E: number, epoca: number): Elementos {
  const M = (((E - f.e * Math.sin(E)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return {
    a: f.a,
    e: f.e,
    i: f.i * GRAD,
    nodo: f.nodo * GRAD,
    omega: f.omega * GRAD,
    M,
    epoca,
  };
}

/**
 * Opción C: se sortean q, e, i, ω y Ω publicados (normales independientes, σ a 1σ; a = q/(1 − e)).
 * Cada órbita se coloca en su punto más cercano a la Tierra en el instante de entrada y solo se
 * conserva si cumple el criterio de encuentro: por defecto, que en la aproximación de dos cuerpos
 * su parámetro de impacto no supere el radio de captura (choca con la Tierra).
 */
export function nubeCondicionada(
  m: Meteorito,
  n: number,
  criterio: CriterioEncuentro = CRITERIO_ENCUENTRO,
) {
  const o = orbitaPrincipal(m);
  const cc = o.cifras_completas;
  const e0 = m.entrada_atmosferica;
  if (!cc || !e0 || !o.q) throw new Error(`${m.id}: faltan las cifras completas o la entrada`);
  const instante = new Date(String(e0.instante.valor));
  const t = Astro.MakeTime(instante);
  const T = tierraEcl(t);
  const altura = criterio.tipo === 'parametro-impacto' ? criterio.alturaAtmosferaKm : undefined;
  const sigma = {
    q: o.q.sigma!,
    e: o.e.sigma!,
    i: o.i.sigma!,
    omega: o.omega.sigma!,
    nodo: o.nodo.sigma!,
  };
  const { normal } = crearAzar(semillaDe(m.id));
  const clones: Elementos[] = [];
  const encuentros: Encuentro[] = [];
  let probadas = 0;
  while (clones.length < n && probadas < 1e7) {
    probadas++;
    const q = cc.q + normal() * sigma.q;
    const e = cc.e + normal() * sigma.e;
    const f: FormaOrbita = {
      a: q / (1 - e),
      e,
      i: cc.i + normal() * sigma.i,
      omega: cc.omega + normal() * sigma.omega,
      nodo: cc.nodo + normal() * sigma.nodo,
    };
    if (!(e >= 0 && e < 1 && q > 0)) continue;
    const { E } = distanciaMinima(f, T);
    const el = elementosEnE(f, E, t.ut);
    const x = encuentroCon(el, t, altura);
    if (!cumpleCriterio(x, criterio)) continue;
    clones.push(el);
    encuentros.push(x);
  }
  const fc = { a: cc.a, e: cc.e, i: cc.i, nodo: cc.nodo, omega: cc.omega };
  const central = distanciaMinima(fc, T);
  const encuentroCentral = encuentroCon(elementosEnE(fc, central.E, t.ut), t, altura);
  return {
    clones,
    encuentros,
    dist: encuentros.map((x) => x.distanciaKm / KM_POR_AU),
    probadas,
    instante,
    sigma,
    criterio,
    encuentroCentral,
    centralCumple: cumpleCriterio(encuentroCentral, criterio),
    nominal: {
      a: cc.a,
      e: cc.e,
      i: cc.i,
      nodo: cc.nodo,
      omega: cc.omega,
      M: ((central.E - cc.e * Math.sin(central.E)) / GRAD + 360) % 360,
      epoca_ut_j2000: t.ut,
    },
  };
}

export function calcularNube(m: Meteorito, catalogo: Catalogo, n = N_NUBE): Calculo {
  const o = orbitaPrincipal(m);
  if (CONDICIONADAS.has(m.id)) {
    const c = nubeCondicionada(m, n);
    const formas = c.clones.map(formaDeElementos);
    const med = (k: keyof FormaOrbita) => mediana(formas.map((x) => x[k]));
    const dd = dDrummond(
      {
        q: med('a') * (1 - med('e')),
        e: med('e'),
        i: med('i') * GRAD,
        nodo: med('nodo') * GRAD,
        omega: med('omega') * GRAD,
      },
      {
        q: num(o.a) * (1 - num(o.e)),
        e: num(o.e),
        i: num(o.i) * GRAD,
        nodo: num(o.nodo) * GRAD,
        omega: num(o.omega) * GRAD,
      },
    );
    const dmax = Math.max(...c.dist);
    const cc = o.cifras_completas!;
    const enc = c.encuentros;
    return {
      nube: {
        metodo: 'elementos-condicionados',
        fuente: o.fuente,
        semilla: semillaDe(m.id),
        condicion: {
          instante: c.instante.toISOString(),
          criterio: 'parametro-impacto',
          altura_atmosfera_km: ALTURA_ATMOSFERA_KM,
          radio_tierra_km: RADIO_TIERRA_KM,
          probadas: c.probadas,
          aceptadas: c.clones.length,
          central: { q: cc.q, e: cc.e, i: cc.i, omega: cc.omega, nodo: cc.nodo },
          sigma: c.sigma,
          encuentro: {
            b_km: rango(enc.map((x) => x.bKm)),
            radio_captura_km: rango(enc.map((x) => x.radioCapturaKm)),
            distancia_km: rango(enc.map((x) => x.distanciaKm)),
            desfase_min: rango(
              enc.map((x) => x.desfaseMin),
              1,
            ),
            central: {
              b_km: red(c.encuentroCentral.bKm, 0),
              radio_captura_km: red(c.encuentroCentral.radioCapturaKm, 0),
              distancia_km: red(c.encuentroCentral.distanciaKm, 0),
            },
          },
        },
        sorteadas: formas.length,
        resumen: resumen(formas),
        descartados: 0,
        validacion: {
          dd_centro: red(dd, 5),
          dist_max_au: red(dmax, 6),
          dist_mediana_au: red(mediana(c.dist), 6),
          aprobada:
            c.clones.length === n &&
            enc.every((x) => cumpleCriterio(x, c.criterio)) &&
            dd <= UMBRAL_DD &&
            c.centralCumple,
        },
        formas: formas.map(formaDe),
      },
      completas: c.clones,
      sigmas: sigmas(formas, o),
      publicada: publicadaDe(o),
      nominal: c.nominal,
    };
  }
  if (DESDE_JPL.has(m.id)) {
    // Órbita telescópica: sorteo de sus elementos (σ formal de JPL, muy pequeña)
    const pc = catalogo.piezas.find((p) => p.id === m.id)?.orbita;
    if (!pc) throw new Error(`${m.id}: sin órbita en el catálogo`);
    const formas = muestrearOrbita(pc, n, semillaDe(m.id));
    const T = tierraEcl(Astro.MakeTime(new Date(String(m.fecha_caida.valor))));
    // Sin anomalía media: distancia mínima de la elipse a la Tierra
    const d = formas.map((f) => Math.min(...puntosForma(f, 20000).map((p) => distancia(p, T))));
    const dmax = Math.max(...d);
    return {
      nube: {
        metodo: 'elementos',
        fuente: pc.fuente,
        semilla: semillaDe(m.id),
        sorteadas: formas.length,
        resumen: resumen(formas),
        descartados: 0,
        validacion: {
          dd_centro: null,
          dist_max_au: red(dmax, 6),
          dist_mediana_au: red(mediana(d), 6),
          aprobada: dmax < UMBRAL_DIST_AU,
        },
        formas: formas.map(formaDe),
      },
      sigmas: sigmas(formas, o),
      publicada: publicadaDe(o),
    };
  }

  const { base, radiante } = entradaPieza(m);
  const cs = (v: Valor) => {
    if (v.sigma === undefined) throw new Error(`${m.id}: radiante sin incertidumbre`);
    return { v: num(v), s: v.sigma };
  };
  const { clones, descartados } = nubeDesdeRadiante(
    base,
    { ra: cs(radiante.ra), dec: cs(radiante.dec), vg: cs(radiante.vg) },
    n,
    semillaDe(m.id),
  );
  const centro = orbitaDeRadiante({
    ...base,
    raGrados: num(radiante.ra),
    decGrados: num(radiante.dec),
    vgKmS: num(radiante.vg),
  }).elementos;
  const dd = dDrummond(
    {
      q: centro.a * (1 - centro.e),
      e: centro.e,
      i: centro.i,
      nodo: centro.nodo,
      omega: centro.omega,
    },
    {
      q: num(o.a) * (1 - num(o.e)),
      e: num(o.e),
      i: num(o.i) * GRAD,
      nodo: num(o.nodo) * GRAD,
      omega: num(o.omega) * GRAD,
    },
  );
  // Posición de cada órbita en el instante de referencia frente a la de la Tierra
  const t = Astro.MakeTime(base.fecha);
  const T = tierraEcl(t);
  const d = clones.map((c) => distancia(estadoDesdeElementos(c.elementos, MU, t.ut).r, T));
  const dmax = Math.max(...d);
  const formas = clones.map((c) => formaDeElementos(c.elementos));
  const sorteada = (f: (c: (typeof clones)[number]) => number) => red(desviacion(clones.map(f)), 6);
  return {
    nube: {
      metodo: 'radiante',
      fuente: radiante.ra.fuente,
      semilla: semillaDe(m.id),
      entrada: {
        instante: base.fecha.toISOString(),
        lat: base.latGrados,
        lon: base.lonGrados,
        altura_km: base.alturaKm,
        ra: cs(radiante.ra),
        dec: cs(radiante.dec),
        vg: cs(radiante.vg),
        nivel_sigma_publicado: radiante.ra.nivel_sigma ?? 'sin dato',
        sigma_sorteada: {
          ra: sorteada((c) => c.radiante.ra),
          dec: sorteada((c) => c.radiante.dec),
          vg: sorteada((c) => c.radiante.vg),
        },
      },
      sorteadas: formas.length,
      resumen: resumen(formas),
      descartados,
      validacion: {
        dd_centro: red(dd, 5),
        dist_max_au: red(dmax, 6),
        dist_mediana_au: red(mediana(d), 6),
        aprobada:
          dd <= UMBRAL_DD &&
          dmax < UMBRAL_DIST_AU &&
          clones.length === n &&
          descartados <= MAX_DESCARTADOS * n,
      },
      formas: formas.map(formaDe),
    },
    completas: clones.map((c) => c.elementos),
    sigmas: sigmas(formas, o),
    publicada: publicadaDe(o),
  };
}

/** Órbita central publicada de Chelyabinsk con su anomalía media (desde el tiempo de perihelio). */
function centralChelyabinsk(o: Orbita) {
  /** «2013-02-15.139» (fecha decimal en TT/ET) → días UT desde J2000. */
  const dia = (texto: string): number => {
    const [, a, me, d, f] = /^(\d{4})-(\d{2})-(\d{2})(\.\d+)?/.exec(texto)!;
    const ms = Date.UTC(Number(a), Number(me) - 1, Number(d)) + Number(f ?? 0) * 864e5;
    return Astro.AstroTime.FromTerrestrialTime((ms - Date.UTC(2000, 0, 1, 12)) / 864e5).ut;
  };
  const epoca = dia(String(o.epoca.valor));
  const perihelio = dia(String(o.tiempo_perihelio!.valor));
  const M = ((((Math.sqrt(MU / num(o.a) ** 3) * (epoca - perihelio)) / GRAD) % 360) + 360) % 360;
  return {
    a: num(o.a),
    e: num(o.e),
    i: num(o.i),
    nodo: num(o.nodo),
    omega: num(o.omega),
    M,
    epoca_ut_j2000: epoca,
  };
}

interface FilaSensibilidad {
  caso: string;
  entrada: string;
  sigma: Record<(typeof CLAVES)[number] | 'omega', number>;
  /** Parámetro de impacto frente al radio de captura (solo los casos A y C). */
  encuentro?: {
    b_km: { min: number; mediana: number; max: number };
    radio_captura_km: { min: number; mediana: number; max: number };
    distancia_km: { min: number; mediana: number; max: number };
    /** Órbitas cuyo parámetro de impacto supera su radio de captura (no chocarían). */
    sin_choque: number;
  };
}

/** Resumen del encuentro de un conjunto de órbitas con la Tierra. */
function resumenEncuentro(enc: Encuentro[]): FilaSensibilidad['encuentro'] {
  return {
    b_km: rango(enc.map((x) => x.bKm)),
    radio_captura_km: rango(enc.map((x) => x.radioCapturaKm)),
    distancia_km: rango(enc.map((x) => x.distanciaKm)),
    sin_choque: enc.filter((x) => !cumpleCriterio(x, CRITERIO_ENCUENTRO)).length,
  };
}

/**
 * ¿De dónde sale la diferencia entre la σ de la nube de Chelyabinsk y la publicada? Se repite la
 * nube variando una sola entrada cada vez y con los márgenes del radiante de Borovička et al.
 * 2013, cuya órbita también está en el dataset. Misma semilla y mismo número de órbitas.
 */
/** σa máxima compatible con σq y σe (a = q/(1 − e), correlación perfecta). */
function sigmaAMaxima(o: Orbita): number {
  const q = o.q ? num(o.q) : num(o.a) * (1 - num(o.e));
  const e = num(o.e);
  return (o.q?.sigma ?? 0) / (1 - e) + (q / (1 - e) ** 2) * o.e.sigma!;
}

function sensibilidadChelyabinsk(m: Meteorito): FilaSensibilidad[] {
  const { base, radiante } = entradaPieza(m);
  const v = (x: Valor) => ({ v: num(x), s: x.sigma! });
  const r = { ra: v(radiante.ra), dec: v(radiante.dec), vg: v(radiante.vg) };
  const fija = (x: { v: number; s: number }) => ({ v: x.v, s: 0 });
  const b = leer<{
    ra: { valor: number; sigma: number };
    dec: { valor: number; sigma: number };
    vg: { valor: number; sigma: number };
  }>('data/verificacion/borovicka-2013-radiante.json');
  const rb = {
    ra: { v: b.ra.valor, s: b.ra.sigma },
    dec: { v: b.dec.valor, s: b.dec.sigma },
    vg: { v: b.vg.valor, s: b.vg.sigma },
  };
  const es = (n: number) => n.toLocaleString('es', { maximumFractionDigits: 4 });
  const txt = (x: typeof r) =>
    `α ${es(x.ra.v)} ± ${es(x.ra.s)}°, δ ${es(x.dec.v)} ± ${es(x.dec.s)}°, v_g ${es(x.vg.v)} ± ${es(x.vg.s)} km/s`;
  const fila = (
    caso: string,
    entrada: string,
    formas: FormaOrbita[],
    encuentros?: Encuentro[],
  ): FilaSensibilidad => {
    const sigma = resumen(formas);
    return {
      caso,
      entrada,
      sigma: {
        ...(Object.fromEntries(CLAVES.map((k) => [k, sigma[k].sigma])) as Record<
          (typeof CLAVES)[number],
          number
        >),
        omega: red(desviacion(formas.map((x) => x.omega)), 4),
      },
      ...(encuentros && { encuentro: resumenEncuentro(encuentros) }),
    };
  };
  const desdeRadiante = (x: typeof r) =>
    nubeDesdeRadiante(base, x, N_CHELYABINSK, semillaDe(m.id)).clones.map((c) =>
      formaDeElementos(c.elementos),
    );
  // A completa: además, su encuentro con la Tierra. Son órbitas calculadas desde estados de
  // entrada (no se sortean elementos), así que sirven para comprobar el criterio de C.
  const clonesA = nubeDesdeRadiante(base, r, N_CHELYABINSK, semillaDe(m.id)).clones;
  const tA = Astro.MakeTime(base.fecha);
  const filas: FilaSensibilidad[] = [
    fila(
      'A: radiante geocéntrico (Tabla 1)',
      txt(r),
      clonesA.map((c) => formaDeElementos(c.elementos)),
      clonesA.map((c) => encuentroCon(c.elementos, tA)),
    ),
    fila(
      'A: solo α_g',
      txt({ ra: r.ra, dec: fija(r.dec), vg: fija(r.vg) }),
      desdeRadiante({ ra: r.ra, dec: fija(r.dec), vg: fija(r.vg) }),
    ),
    fila(
      'A: solo δ_g',
      txt({ ra: fija(r.ra), dec: r.dec, vg: fija(r.vg) }),
      desdeRadiante({ ra: fija(r.ra), dec: r.dec, vg: fija(r.vg) }),
    ),
    fila(
      'A: solo v_g',
      txt({ ra: fija(r.ra), dec: fija(r.dec), vg: r.vg }),
      desdeRadiante({ ra: fija(r.ra), dec: fija(r.dec), vg: r.vg }),
    ),
    fila('Borovička: radiante geocéntrico', txt(rb), desdeRadiante(rb)),
  ];
  // B: radiante aparente y velocidad de entrada (Tabla S5A), el método que describe Popova
  const e = m.entrada_atmosferica!;
  const { normal } = crearAzar(semillaDe(m.id));
  const formasB: FormaOrbita[] = [];
  while (formasB.length < N_CHELYABINSK) {
    const reg = registroDesdeRadianteAparente(
      new Date(String(e.instante.valor)),
      num(e.lat),
      num(e.lon),
      num(e.altura),
      num(e.ra_aparente) + normal() * e.ra_aparente.sigma!,
      num(e.dec_aparente) + normal() * e.dec_aparente.sigma!,
      num(e.v_entrada) + normal() * e.v_entrada.sigma!,
    );
    const el = orbitaDesdeBolido(reg, { hipotesis: 'ecef-relativa' }).elementos;
    if (el.e < 1) formasB.push(formaDeElementos(el));
  }
  filas.push(
    fila(
      'B: radiante aparente y V∞ (Tabla S5A)',
      `α ${es(num(e.ra_aparente))} ± ${es(e.ra_aparente.sigma!)}°, δ ${es(num(e.dec_aparente))} ± ${es(e.dec_aparente.sigma!)}°, V∞ ${es(num(e.v_entrada))} ± ${es(e.v_entrada.sigma!)} km/s`,
      formasB,
    ),
  );
  // C: elementos publicados condicionados al encuentro: el criterio vigente y el anterior
  const anterior = CRITERIO_ANTERIOR.tipo === 'distancia' ? CRITERIO_ANTERIOR.umbralKm : NaN;
  for (const [caso, criterio] of [
    ['C: elementos de la S5B, b ≤ radio de captura (elegida)', CRITERIO_ENCUENTRO],
    [`C con el criterio anterior (distancia < ${es(anterior)} km)`, CRITERIO_ANTERIOR],
  ] as const) {
    const c = nubeCondicionada(m, N_CHELYABINSK, criterio);
    filas.push(
      fila(
        caso,
        `q, e, i, ω, Ω con su σ; aceptadas ${c.clones.length} de ${es(c.probadas)}`,
        c.clones.map(formaDeElementos),
        c.encuentros,
      ),
    );
  }
  return filas;
}

function informe(
  nubes: NubesPedigri,
  calc: Map<string, Calculo>,
  sens: FilaSensibilidad[],
  chely: Meteorito,
): string {
  const f = (x: number | null | undefined, d = 3) =>
    x === null || x === undefined ? '—' : x.toLocaleString('es', { maximumFractionDigits: d });
  const km = (au: number) => `${Math.round(au * 149597870.7).toLocaleString('es')} km`;
  const filas = Object.entries(nubes.piezas).map(([id, p]) => {
    const s = calc.get(id)?.sigmas;
    const par = (k: 'a' | 'e' | 'i' | 'q', d: number) =>
      s ? `${f(s[k].nube, d)} / ${f(s[k].publicada, d)}` : '—';
    return `| ${id} | ${p.metodo} | ${p.fuente} | ${p.sorteadas} | ${p.descartados} | ${f(p.validacion.dd_centro, 5)} | ${km(p.validacion.dist_mediana_au)} | ${km(p.validacion.dist_max_au)} | ${par('a', 3)} | ${par('e', 4)} | ${par('i', 2)} | ${par('q', 4)} | ${p.validacion.aprobada ? 'sí' : '**NO**'} |`;
  });
  // Solo a, e, i (q se deriva de a y e) y solo las nubes sorteadas desde el radiante
  const difiere = (x: { nube: number; publicada: number | undefined }) =>
    !!x.publicada && x.nube > 0 && Math.abs(Math.log(x.nube / x.publicada)) > Math.log(1.4);
  const distintas = [...calc.entries()]
    .filter(([id]) => nubes.piezas[id]?.metodo === 'radiante')
    .map(([id, c]) => [id, (['a', 'e', 'i'] as const).filter((k) => difiere(c.sigmas[k]))] as const)
    .filter(([, ks]) => ks.length)
    .map(([id, ks]) => `${id} (${ks.join(', ')})`);
  // Entradas y reproducibilidad
  const filasEntrada = Object.entries(nubes.piezas)
    .filter(([, p]) => p.entrada)
    .map(([id, p]) => {
      const e = p.entrada!;
      const cmp = (k: 'ra' | 'dec' | 'vg', d: number) =>
        `${f(e.sigma_sorteada[k], d)} / ${f(e[k].s, d)}`;
      const g = (x: number) => f(x, 6);
      return `| ${id} | ${e.instante} | ${g(e.lat)}, ${g(e.lon)}, ${g(e.altura_km)} km | ${g(e.ra.v)} ± ${g(e.ra.s)} | ${g(e.dec.v)} ± ${g(e.dec.s)} | ${g(e.vg.v)} ± ${g(e.vg.s)} | ${e.nivel_sigma_publicado} | ${p.semilla} | ${cmp('ra', 3)} | ${cmp('dec', 3)} | ${cmp('vg', 4)} |`;
    });
  // Centro de la nube frente a la órbita publicada, en unidades de su σ
  const filasCentro = Object.entries(nubes.piezas).map(([id, p]) => {
    const o = calc.get(id)?.publicada;
    const celda = (k: (typeof CLAVES)[number], d: number) => {
      const pub = o?.[k];
      if (!pub) return f(p.resumen[k].mediana, d);
      const z = pub.s ? (p.resumen[k].mediana - pub.v) / pub.s : null;
      return `${f(p.resumen[k].mediana, d)} / ${f(pub.v, d)}${z === null ? '' : ` (${z >= 0 ? '+' : ''}${f(z, 2)}σ)`}`;
    };
    return `| ${id} | ${celda('a', 3)} | ${celda('e', 4)} | ${celda('i', 2)} | ${celda('q', 4)} |`;
  });
  const orb = (fuente: string) => chely.orbitas.find((o) => o.fuente === fuente);
  const sigmaPub = (fuente: string) => {
    const o = orb(fuente);
    if (!o) return '—';
    const q = o.q?.sigma;
    return `| Publicada: órbita de ${fuente} (1σ) | — | ${f(o.a.sigma, 3)} | ${f(o.e.sigma, 4)} | ${f(o.i.sigma, 2)} | ${f(q, 4)} | ${f(o.omega.sigma, 2)} |`;
  };
  const filasSens = sens.map(
    (x) =>
      `| ${x.caso} | ${x.entrada} | ${f(x.sigma.a, 3)} | ${f(x.sigma.e, 4)} | ${f(x.sigma.i, 2)} | ${f(x.sigma.q, 4)} | ${f(x.sigma.omega, 2)} |`,
  );
  const tasa = (c: { aceptadas: number; probadas: number }) =>
    f((100 * c.aceptadas) / c.probadas, 3);
  const rangoKm = (r: { min: number; mediana: number; max: number }) =>
    `${f(r.min, 0)}, ${f(r.mediana, 0)} y ${f(r.max, 0)} km`;
  const caso = (inicio: string) => sens.find((x) => x.caso.startsWith(inicio));
  const s0 = caso('A: radiante geocéntrico');
  const principal = [...sens.filter((x) => x.caso.startsWith('A: solo'))].sort(
    (a, b) => b.sigma.i - a.sigma.i,
  )[0];
  const bor = caso('Borovička');
  const sB = caso('B:');
  const sC = caso('C: elementos');
  const sCc = caso('C con el criterio anterior');
  const oBor = orb('borovicka-2013-nature');
  const oPop = orb('popova-2013-science');
  const ncChely = nubes.piezas['chelyabinsk']?.condicion;
  /** σ de la nube frente a la publicada, elemento a elemento. */
  const coherencia = (x: FilaSensibilidad, o: Orbita) =>
    CLAVES.filter((k) => (k === 'q' ? o.q?.sigma : o[k].sigma))
      .map((k) => {
        const pub = (k === 'q' ? o.q!.sigma : o[k].sigma)!;
        return `σ${k} ${f(x.sigma[k], k === 'i' ? 2 : 4)} frente a ${f(pub, k === 'i' ? 2 : 4)}`;
      })
      .join('; ');
  /** Desajuste medio |ln(σ nube / σ publicada)| en a, e, i. */
  const desajuste = (x: FilaSensibilidad, o: Orbita) =>
    (['a', 'e', 'i'] as const).reduce(
      (acc, k) => acc + Math.abs(Math.log(x.sigma[k] / o[k].sigma!)),
      0,
    ) / 3;

  return `# Nubes de órbitas de las piezas con pedigrí

Generado por \`npm run datos:nubes\` (\`pipeline/nubes-pedigri.ts\`) el ${nubes.generado.slice(0, 10)}. No editar a mano.

${procedenciaReporte(['pipeline/nubes-pedigri.ts', 'pipeline/trayectorias-pedigri.ts', 'public/data/catalogo.json', 'data/verificacion/borovicka-2013-radiante.json', ...readdirSync('data/pedigri').map((x) => `data/pedigri/${x}`)])}

## Método

${nubes.metodo}

Criterio de parada por pieza: el radiante central reproduce la órbita principal (D_D ≤ ${UMBRAL_DD}), todas las órbitas pasan a menos de ${UMBRAL_DIST_AU} au (${km(UMBRAL_DIST_AU)}) de la Tierra en el instante de referencia y se descarta como mucho el ${MAX_DESCARTADOS * 100} % de los sorteos (órbitas no elípticas). En Chelyabinsk (método C): todas las órbitas chocan con la Tierra en la aproximación de dos cuerpos (parámetro de impacto menor o igual que el radio de captura, con ${ALTURA_ATMOSFERA_KM} km de atmósfera sobre ${RADIO_TIERRA_KM} km de radio terrestre), la órbita central publicada también, y la mediana de la nube a D_D ≤ ${UMBRAL_DD} de la órbita publicada.

Hasta el 2026-10-12 cada nube sorteaba los elementos orbitales por separado. Con ese método, en 21 de las 25 piezas menos de la mitad de las órbitas pasaba a menos de 0,002 au de la Tierra (en Chelyabinsk, el 6 %; en Maribo y Villalbeto de la Peña, ninguna).

## Resultado

| Pieza | Método | Fuente | Órbitas | Descartadas | D_D centro | Distancia mediana | Distancia máxima | σa nube / publicada (au) | σe nube / publicada | σi nube / publicada (°) | σq nube / publicada (au) | Aprobada |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${filas.join('\n')}

## Entradas y reproducibilidad

Cada nube se reproduce con estas entradas, su semilla (\`semillaDe(id)\`, FNV-1a de 32 bits del identificador) y \`nubeDesdeRadiante\` (\`src/core/montecarlo.ts\`). Las dos últimas columnas comprueban el procedimiento declarado: la σ de los valores que se sortearon de verdad frente a la σ de entrada (1σ). Instante y posición son los de referencia de la estela; altura convencional.

| Pieza | Instante (UTC) | Lat, lon, altura | α_g ± σ (°) | δ_g ± σ (°) | v_g ± σ (km/s) | Nivel publicado | Semilla | σα sorteada / entrada | σδ sorteada / entrada | σv_g sorteada / entrada |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${filasEntrada.join('\n')}

${
  ncChely
    ? `Chelyabinsk (método C): órbita central de Popova et al. con todas sus cifras (q ${ncChely.central.q}, e ${ncChely.central.e}, i ${ncChely.central.i}°, ω ${ncChely.central.omega}°, Ω ${ncChely.central.nodo}°); σ a 1σ de la Tabla S5B: q ${ncChely.sigma.q}, e ${ncChely.sigma.e}, i ${ncChely.sigma.i}°, ω ${ncChely.sigma.omega}°, Ω ${ncChely.sigma.nodo}°; a = q/(1 − e). Instante de entrada ${ncChely.instante}; criterio: parámetro de impacto menor o igual que el radio de captura (Tierra de ${ncChely.radio_tierra_km} km más ${ncChely.altura_atmosfera_km} km de atmósfera); semilla ${nubes.piezas['chelyabinsk']!.semilla}; ${ncChely.aceptadas} órbitas aceptadas de ${ncChely.probadas.toLocaleString('es')} sorteos (${tasa(ncChely)} %).

Encuentro de las órbitas aceptadas (mínimo, mediana y máximo): parámetro de impacto ${rangoKm(ncChely.encuentro.b_km)}; radio de captura ${rangoKm(ncChely.encuentro.radio_captura_km)}; distancia a la Tierra en el instante de entrada ${rangoKm(ncChely.encuentro.distancia_km)}. La máxima aproximación de la trayectoria relativa cae entre ${f(ncChely.encuentro.desfase_min.min, 1)} y ${f(ncChely.encuentro.desfase_min.max, 1)} minutos del instante de entrada. Órbita central: parámetro de impacto ${f(ncChely.encuentro.central.b_km, 0)} km frente a un radio de captura de ${f(ncChely.encuentro.central.radio_captura_km, 0)} km, a ${f(ncChely.encuentro.central.distancia_km, 0)} km de la Tierra.`
    : ''
}

## Centro de la nube frente a la órbita publicada

Mediana de las órbitas de la nube frente al valor central publicado; entre paréntesis, la diferencia en unidades de la σ publicada (1σ).

| Pieza | a (au) | e | i (°) | q (au) |
| --- | --- | --- | --- | --- |
${filasCentro.join('\n')}

## Chelyabinsk: qué entradas alimentan la nube

Misma semilla y ${N_CHELYABINSK} órbitas en cada caso. A es el método de las demás piezas (radiante geocéntrico; antes también el de Chelyabinsk); se repite variando una sola entrada cada vez y con los márgenes de Borovička et al. 2013 (\`data/verificacion/borovicka-2013-radiante.json\`). B usa el radiante aparente y la velocidad de entrada de Popova et al., de los que dicen haber obtenido los márgenes de su órbita con un Monte Carlo (material suplementario, pág. 18). C, la elegida por el usuario el 2026-10-12, sortea los elementos de la Tabla S5B (1σ) y conserva solo las órbitas que chocan con la Tierra en el instante de entrada en la aproximación de dos cuerpos (parámetro de impacto menor o igual que el radio de captura); también se muestra con el criterio anterior, una distancia geométrica de 15.000 km.

| Caso | Entradas (1σ) | σa (au) | σe | σi (°) | σq (au) | σω (°) |
| --- | --- | --- | --- | --- | --- | --- |
${filasSens.join('\n')}
${sigmaPub('popova-2013-science')}
${sigmaPub('borovicka-2013-nature')}

${
  s0 &&
  principal &&
  bor &&
  sB &&
  sC &&
  sCc &&
  oBor &&
  oPop &&
  ncChely &&
  s0.encuentro &&
  sC.encuentro &&
  sCc.encuentro
    ? `- **A.** Con los márgenes del radiante geocéntrico de Popova, la entrada que más dispersión produce en i es ${principal.caso.replace('A: solo ', '')} (σi ${f(principal.sigma.i, 2)}° de ${f(s0.sigma.i, 2)}°), y la nube sale más ancha que la órbita publicada (${coherencia(s0, oPop)}). Ese margen del radiante (±0,8° a 1σ en la Tabla 1; ±1,0° en el suplemento) es unas diez veces el del radiante aparente (±0,09°).
- **Comprobación del criterio de C con A.** Las órbitas de A no se sortean por elementos: se calculan desde estados de entrada en la atmósfera, así que chocan por construcción. ${s0.encuentro.sin_choque === 0 ? 'Todas cumplen el criterio de C' : `**${s0.encuentro.sin_choque} no cumplen el criterio de C**`}: parámetro de impacto ${rangoKm(s0.encuentro.b_km)} (mínimo, mediana y máximo), frente a un radio de captura de unos ${f(s0.encuentro.radio_captura_km.mediana, 0)} km. En el instante de entrada están a ${rangoKm(s0.encuentro.distancia_km)} de la Tierra: la distancia geométrica no es la magnitud que se compara con el radio de captura.
- **Borovička.** Con su radiante y sus márgenes, la nube da ${coherencia(bor, oBor)}: su par de márgenes, radiante y órbita, es ${desajuste(bor, oBor) < desajuste(s0, oPop) ? 'bastante más coherente que el de Popova' : 'tan poco coherente como el de Popova'}. Su órbita es osculadora 60 días antes del impacto, así que esta comparación es orientativa.
- **B.** El radiante aparente y la velocidad de entrada de Popova reproducen el centro de su órbita (la estela parte de ellos), pero con sus márgenes la nube sale más estrecha que la órbita publicada (${coherencia(sB, oPop)}). Una explicación posible es que su Monte Carlo incluyera otras fuentes de error que el suplemento no detalla.
- **C (elegida).** Reproduce los márgenes publicados de e e i (${coherencia(sC, oPop)}). σq y σω (${f(sC.sigma.omega, 2)}° frente a ${f(oPop.omega.sigma, 2)}°) salen menores porque el encuentro con la Tierra los restringe, y σa (que la Tabla S5B no da) sale de q y e. Con una propagación lineal, la σa que publica la Tabla 1 (${f(oPop.a.sigma, 2)} au) es mayor de lo que admiten σq y σe (${f(sigmaAMaxima(oPop), 3)} au como máximo, incluso con correlación perfecta); la documentación disponible no explica la diferencia. Se aceptaron ${ncChely.aceptadas} de ${ncChely.probadas.toLocaleString('es')} sorteos (${tasa(ncChely)} %).
- **Criterio anterior.** Con una distancia geométrica menor que 15.000 km en el instante de entrada, ${sCc.encuentro.sin_choque} de las ${N_CHELYABINSK} órbitas aceptadas no chocarían: su parámetro de impacto supera su radio de captura (llega a ${f(sCc.encuentro.b_km.max, 0)} km). La dispersión casi no cambia (${coherencia(sCc, oPop)}).
`
    : ''
}
## Cómo leerlo

- La distancia es la que separa la posición de cada órbita del centro de la Tierra en el instante de referencia (con el método \`elementos\`, la distancia mínima de la elipse). Son órbitas pre-atmosféricas, calculadas sin la atracción de la Tierra en el último tramo, así que es normal que queden a unas decenas de miles de kilómetros: es la desviación que produce la gravedad terrestre. La estela del año previo, que sí la incluye, llega a la posición de referencia.
- Piezas en las que la σ de la nube y la publicada difieren en más de un 40 % en a, e o i: ${distintas.join(', ') || 'ninguna'}.
- La σ de la nube sale de propagar la incertidumbre del radiante y de v_g; la publicada es la de la órbita principal (1σ). No tienen por qué coincidir: las fuentes no publican cómo se relacionan sus errores (covarianza), y en algunas los márgenes del radiante y los de la órbita no son coherentes entre sí si se tratan como independientes. Por eso Chelyabinsk usa el método C (sección anterior).
- En Chelyabinsk, cada órbita sorteada se coloca en su punto más cercano a la Tierra en el instante de entrada y se acepta si su parámetro de impacto (la distancia a la que su trayectoria relativa, recta y sin la atracción terrestre, pasaría del centro de la Tierra) no supera el radio de captura r·√(1 + v_esc²/v_g²), con r el radio terrestre más la atmósfera y v_g la velocidad relativa de esa órbita. Es una aproximación de dos cuerpos: no simula el encuentro ni el paso por la atmósfera, y condiciona la geometría de la órbita, no reconstruye la distribución completa de los errores de observación originales.
- Granvik & Brown 2018 no declaran el nivel de la incertidumbre del radiante; se asume 1σ, como en el resto del dataset.
- Cada valor se sortea de una normal con su σ a 1σ: en cada variable, cerca del 31,7 % de las muestras cae fuera de ±1σ, y con tres variables independientes alrededor del 68,2 % tiene al menos una fuera.
- Las nubes muestran la dispersión de este modelo, no una probabilidad calibrada de por dónde pasó cada meteoroide.
`;
}

if (process.argv[1]?.endsWith('nubes-pedigri.ts')) {
  const pedidos = process.argv.slice(2);
  const catalogo = leer<Catalogo>('public/data/catalogo.json');
  const meteoritos = readdirSync('data/pedigri')
    .filter((x) => x.endsWith('.json'))
    .map((x) => Meteorito.parse(leer(`data/pedigri/${x}`)))
    .sort((a, b) => a.id.localeCompare(b.id));
  const previo = pedidos.length && existsSync(SALIDA) ? leer<NubesPedigri>(SALIDA) : undefined;
  const anterior = previo?.piezas;
  const anteriorSens = previo?.sensibilidad_chelyabinsk;
  const piezas: Record<string, NubePieza> = {};
  const calc = new Map<string, Calculo>();
  const rechazadas: string[] = [];
  let guardarChelyabinsk: (() => void) | undefined;
  for (const m of meteoritos) {
    if (anterior && !pedidos.includes(m.id) && anterior[m.id]) {
      piezas[m.id] = anterior[m.id]!;
      continue;
    }
    const t0 = performance.now();
    const chely = m.id === 'chelyabinsk';
    const c = calcularNube(m, catalogo, chely ? N_CHELYABINSK : N_NUBE);
    calc.set(m.id, c);
    piezas[m.id] = { ...c.nube, formas: c.nube.formas.slice(0, N_NUBE) };
    const v = c.nube.validacion;
    console.log(
      `${m.id}: ${c.nube.metodo} · D_D centro ${v.dd_centro ?? '—'} · distancia máx. ${v.dist_max_au} au · descartadas ${c.nube.descartados} · ${((performance.now() - t0) / 1000).toFixed(1)} s · ${v.aprobada ? 'aprobada' : 'RECHAZADA'}`,
    );
    if (!v.aprobada) rechazadas.push(m.id);
    if (chely)
      guardarChelyabinsk = () =>
        writeFileSync(
          'public/data/chelyabinsk-orbitas.json',
          JSON.stringify({
            generado: new Date().toISOString(),
            nota: 'Elementos eclípticos J2000 (grados, AU) en el instante de entrada de Popova et al. Nube: se sortean q, e, i, ω y Ω de la órbita publicada con su σ a 1σ (a = q/(1 − e)); cada órbita se coloca en su punto más cercano a la Tierra en ese instante y solo se conserva si su parámetro de impacto no supera el radio de captura (choca en la aproximación de dos cuerpos). Las 160 primeras son las del catálogo. La nominal es la órbita publicada con todas sus cifras (material suplementario, págs. 18–19).',
            fuente_orbita: orbitaPrincipal(m).fuente,
            muestreo: { metodo: c.nube.metodo, fuente: c.nube.fuente, semilla: semillaDe(m.id) },
            validacion: c.nube.validacion,
            nominal: c.nominal ?? centralChelyabinsk(orbitaPrincipal(m)),
            clones: c.completas!.map((el) => ({
              a: el.a,
              e: el.e,
              i: el.i / GRAD,
              nodo: el.nodo / GRAD,
              omega: el.omega / GRAD,
              M: el.M / GRAD,
              epoca_ut_j2000: el.epoca,
            })),
          }) + '\n',
        );
  }
  if (rechazadas.length) {
    console.error(`Criterio de parada: ${rechazadas.join(', ')} (no se guardó nada).`);
    process.exit(2);
  }
  guardarChelyabinsk?.();
  const chely = meteoritos.find((m) => m.id === 'chelyabinsk')!;
  const sens = pedidos.length ? anteriorSens : sensibilidadChelyabinsk(chely);
  const nubes: NubesPedigri = {
    generado: new Date().toISOString(),
    metodo:
      'Para cada pieza se sortean el radiante geocéntrico (α_g, δ_g) y la velocidad geocéntrica v_g publicados, con distribuciones normales independientes de desviación típica igual a su incertidumbre a 1σ, y cada clon se integra con N cuerpos desde la posición e instante de referencia (altura convencional de 100 km), igual que la estela del año previo; los elementos son los pre-atmosféricos en ese instante. Almahata Sitta: sorteo de los elementos de su órbita telescópica de JPL (σ formal). Chelyabinsk (decisión del 2026-10-12, método C): se sortean q, e, i, ω y Ω de la órbita de Popova et al. (Tabla S5B, 1σ; a = q/(1 − e)); cada órbita se coloca en su punto más cercano a la Tierra en el instante de entrada y solo se conserva si su parámetro de impacto no supera el radio de captura, es decir, si choca con la Tierra en la aproximación de dos cuerpos (desde el 2026-10-12, auditoría V5; antes, distancia geométrica < 15 000 km).',
    piezas,
    ...(sens && { sensibilidad_chelyabinsk: sens }),
  };
  writeFileSync(SALIDA, JSON.stringify(nubes) + '\n');
  if (!pedidos.length) writeFileSync('docs/reportes/nubes.md', informe(nubes, calc, sens!, chely));
  else console.log('Cálculo parcial: el reporte solo se regenera con todas las piezas.');
}
