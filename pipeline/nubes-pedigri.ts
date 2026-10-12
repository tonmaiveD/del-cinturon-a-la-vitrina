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
  return {
    nube: {
      metodo: 'radiante',
      fuente: radiante.ra.fuente,
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

function informe(nubes: NubesPedigri, calc: Map<string, Calculo>): string {
  const f = (x: number | null | undefined, d = 3) =>
    x === null || x === undefined ? '—' : x.toLocaleString('es', { maximumFractionDigits: d });
  const km = (au: number) => `${Math.round(au * 149597870.7).toLocaleString('es')} km`;
  const filas = Object.entries(nubes.piezas).map(([id, p]) => {
    const s = calc.get(id)?.sigmas;
    const par = (k: 'a' | 'e' | 'i' | 'q', d: number) =>
      s ? `${f(s[k].nube, d)} / ${f(s[k].publicada, d)}` : '—';
    return `| ${id} | ${p.metodo} | ${p.fuente} | ${p.formas.length} | ${p.descartados} | ${f(p.validacion.dd_centro, 5)} | ${km(p.validacion.dist_mediana_au)} | ${km(p.validacion.dist_max_au)} | ${par('a', 3)} | ${par('e', 4)} | ${par('i', 2)} | ${par('q', 4)} | ${p.validacion.aprobada ? 'sí' : '**NO**'} |`;
  });
  // Solo a, e, i (q se deriva de a y e) y solo las nubes sorteadas desde el radiante
  const difiere = (x: { nube: number; publicada: number | undefined }) =>
    !!x.publicada && x.nube > 0 && Math.abs(Math.log(x.nube / x.publicada)) > Math.log(1.4);
  const distintas = [...calc.entries()]
    .filter(([id]) => nubes.piezas[id]?.metodo === 'radiante')
    .map(([id, c]) => [id, (['a', 'e', 'i'] as const).filter((k) => difiere(c.sigmas[k]))] as const)
    .filter(([, ks]) => ks.length)
    .map(([id, ks]) => `${id} (${ks.join(', ')})`);
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
  const anterior =
    pedidos.length && existsSync(SALIDA) ? leer<NubesPedigri>(SALIDA).piezas : undefined;
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
  const nubes: NubesPedigri = {
    generado: new Date().toISOString(),
    metodo:
      'Para cada pieza se sortean el radiante geocéntrico (α_g, δ_g) y la velocidad geocéntrica v_g publicados, con distribuciones normales independientes de desviación típica igual a su incertidumbre a 1σ, y cada clon se integra con N cuerpos desde la posición e instante de referencia (altura convencional de 100 km), igual que la estela del año previo; los elementos son los pre-atmosféricos en ese instante. Almahata Sitta: sorteo de los elementos de su órbita telescópica de JPL (σ formal).',
    piezas,
  };
  writeFileSync(SALIDA, JSON.stringify(nubes) + '\n');
  if (!pedidos.length) writeFileSync('docs/reportes/nubes.md', informe(nubes, calc));
  else console.log('Cálculo parcial: el reporte solo se regenera con todas las piezas.');
}
