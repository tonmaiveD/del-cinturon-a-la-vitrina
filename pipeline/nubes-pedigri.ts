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
import { eqjAEcl } from '../src/core/marcos';
import { nubeDesdeRadiante, orbitaDeRadiante } from '../src/core/montecarlo';
import { muestrearOrbita, puntosForma, semillaDe, type FormaOrbita } from '../src/core/muestreo';
import { dDrummond } from '../src/core/similitud';
import { GRAD, type Vec3 } from '../src/core/vector';
import { Meteorito, type Orbita, type Valor } from '../src/schema';
import type { Catalogo, FormaNube, NubePieza, NubesPedigri } from '../src/ui/catalogo';
import { DESDE_JPL, entradaPieza } from './trayectorias-pedigri';

export const N_NUBE = 160;
export const N_CHELYABINSK = 300;
export const UMBRAL_DIST_AU = 0.002;
const UMBRAL_DD = 0.1;
const MAX_DESCARTADOS = 0.1;
const SALIDA = 'public/data/nubes.json';
const MU = gm('Sun');

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

export function calcularNube(m: Meteorito, catalogo: Catalogo, n = N_NUBE): Calculo {
  const o = orbitaPrincipal(m);
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
  sigma: Record<(typeof CLAVES)[number], number>;
}

/**
 * ¿De dónde sale la diferencia entre la σ de la nube de Chelyabinsk y la publicada? Se repite la
 * nube variando una sola entrada cada vez y con los márgenes del radiante de Borovička et al.
 * 2013, cuya órbita también está en el dataset. Misma semilla y mismo número de órbitas.
 */
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
  const casos: [string, typeof r][] = [
    ['Popova: las tres entradas', r],
    ['Popova: solo α_g', { ra: r.ra, dec: fija(r.dec), vg: fija(r.vg) }],
    ['Popova: solo δ_g', { ra: fija(r.ra), dec: r.dec, vg: fija(r.vg) }],
    ['Popova: solo v_g', { ra: fija(r.ra), dec: fija(r.dec), vg: r.vg }],
    ['Borovička: las tres entradas', rb],
  ];
  return casos.map(([caso, x]) => {
    const { clones } = nubeDesdeRadiante(base, x, N_CHELYABINSK, semillaDe(m.id));
    const sigma = resumen(clones.map((c) => formaDeElementos(c.elementos)));
    return {
      caso,
      entrada: txt(x),
      sigma: Object.fromEntries(
        CLAVES.map((k) => [k, sigma[k].sigma]),
      ) as FilaSensibilidad['sigma'],
    };
  });
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
    return `| Publicada: órbita de ${fuente} (1σ) | — | ${f(o.a.sigma, 3)} | ${f(o.e.sigma, 4)} | ${f(o.i.sigma, 2)} | ${f(q, 4)} |`;
  };
  const filasSens = sens.map(
    (x) =>
      `| ${x.caso} | ${x.entrada} | ${f(x.sigma.a, 3)} | ${f(x.sigma.e, 4)} | ${f(x.sigma.i, 2)} | ${f(x.sigma.q, 4)} |`,
  );
  const s0 = sens.find((x) => x.caso === 'Popova: las tres entradas');
  const principal = [...sens.filter((x) => x.caso.startsWith('Popova: solo'))].sort(
    (a, b) => b.sigma.i - a.sigma.i,
  )[0];
  const bor = sens.find((x) => x.caso.startsWith('Borovička'));
  const oBor = orb('borovicka-2013-nature');
  const oPop = orb('popova-2013-science');
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

## Método

${nubes.metodo}

Criterio de parada por pieza: el radiante central reproduce la órbita principal (D_D ≤ ${UMBRAL_DD}), todas las órbitas pasan a menos de ${UMBRAL_DIST_AU} au (${km(UMBRAL_DIST_AU)}) de la Tierra en el instante de referencia y se descarta como mucho el ${MAX_DESCARTADOS * 100} % de los sorteos (órbitas no elípticas).

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

## Centro de la nube frente a la órbita publicada

Mediana de las órbitas de la nube frente al valor central publicado; entre paréntesis, la diferencia en unidades de la σ publicada (1σ).

| Pieza | a (au) | e | i (°) | q (au) |
| --- | --- | --- | --- | --- |
${filasCentro.join('\n')}

## Chelyabinsk: de dónde sale la diferencia en la dispersión

Misma semilla y ${N_CHELYABINSK} órbitas en cada caso. Primero se varía una sola entrada cada vez con los márgenes de Popova et al.; después se usan el radiante y los márgenes de Borovička et al. 2013 (\`data/verificacion/borovicka-2013-radiante.json\`), cuya órbita también está en el dataset.

| Caso | Entradas (1σ) | σa (au) | σe | σi (°) | σq (au) |
| --- | --- | --- | --- | --- | --- |
${filasSens.join('\n')}
${sigmaPub('popova-2013-science')}
${sigmaPub('borovicka-2013-nature')}

${
  s0 && principal && bor && oBor && oPop
    ? `- Con los márgenes de Popova, la entrada que más dispersión produce en i es ${principal.caso.replace('Popova: solo ', '')} (σi ${f(principal.sigma.i, 2)}° de ${f(s0.sigma.i, 2)}°). La nube completa da σi ${f(s0.sigma.i, 2)}°, frente a ${f(oPop.i.sigma, 2)}° que Popova publica para la órbita: los márgenes del radiante de Popova, tratados como independientes, no reproducen los de su órbita (${coherencia(s0, oPop)}).
- Con el radiante y los márgenes de Borovička, la nube da ${coherencia(bor, oBor)}. Su par de márgenes, radiante y órbita, es ${desajuste(bor, oBor) < desajuste(s0, oPop) ? 'bastante más coherente que el de Popova' : 'tan poco coherente como el de Popova'}. La órbita de Borovička es osculadora 60 días antes del impacto, así que esta comparación es orientativa.
- Conclusión: la nube aplica fielmente los márgenes del radiante que publica Popova (ver las σ sorteadas arriba). La diferencia con los márgenes de su órbita está en la propia fuente, que no explica cómo obtuvo unos y otros, y sin su covarianza no se puede reconciliar. La ficha lo dice y no atribuye a la nube más precisión que la de su radiante.`
    : ''
}

## Cómo leerlo

- La distancia es la que separa la posición de cada órbita del centro de la Tierra en el instante de referencia (con el método \`elementos\`, la distancia mínima de la elipse). Son órbitas pre-atmosféricas, calculadas sin la atracción de la Tierra en el último tramo, así que es normal que queden a unas decenas de miles de kilómetros: es la desviación que produce la gravedad terrestre. La estela del año previo, que sí la incluye, llega a la posición de referencia.
- Piezas en las que la σ de la nube y la publicada difieren en más de un 40 % en a, e o i: ${distintas.join(', ') || 'ninguna'}.
- La σ de la nube sale de propagar la incertidumbre del radiante y de v_g; la publicada es la de la órbita principal (1σ). No tienen por qué coincidir: las fuentes no publican cómo se relacionan sus errores (covarianza), y en algunas los márgenes del radiante y los de la órbita no son coherentes entre sí si se tratan como independientes. En Chelyabinsk, con los márgenes de Popova et al. (publicados a 2σ y convertidos aquí a 1σ), la nube es más estrecha en a y más ancha en i que la órbita publicada.
- Granvik & Brown 2018 no declaran el nivel de la incertidumbre del radiante; se asume 1σ, como en el resto del dataset.
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
            nota: 'Elementos eclípticos J2000 (grados, AU) en el instante de referencia. Nube: se sortean el radiante geocéntrico y v_g de la fuente con su σ a 1σ y cada clon se integra con N cuerpos, como la estela; las 160 primeras son las del catálogo. La nominal son los valores centrales publicados de la órbita.',
            fuente_orbita: orbitaPrincipal(m).fuente,
            muestreo: { metodo: 'radiante', fuente: c.nube.fuente, semilla: semillaDe(m.id) },
            validacion: c.nube.validacion,
            nominal: centralChelyabinsk(orbitaPrincipal(m)),
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
      'Para cada pieza se sortean el radiante geocéntrico (α_g, δ_g) y la velocidad geocéntrica v_g publicados, con distribuciones normales independientes de desviación típica igual a su incertidumbre a 1σ, y cada clon se integra con N cuerpos desde la posición e instante de referencia (altura convencional de 100 km), igual que la estela del año previo; los elementos son los pre-atmosféricos en ese instante. Almahata Sitta: sorteo de los elementos de su órbita telescópica de JPL (σ formal).',
    piezas,
    ...(sens && { sensibilidad_chelyabinsk: sens }),
  };
  writeFileSync(SALIDA, JSON.stringify(nubes) + '\n');
  if (!pedidos.length) writeFileSync('docs/reportes/nubes.md', informe(nubes, calc, sens!, chely));
  else console.log('Cálculo parcial: el reporte solo se regenera con todas las piezas.');
}
