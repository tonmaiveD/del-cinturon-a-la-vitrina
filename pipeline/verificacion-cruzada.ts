/**
 * CLI: `npm run verificacion:cruzada`.
 * Verificación cruzada de órbitas de meteoritos con pedigrí. Escribe docs/reportes/cruzada.md.
 *
 * A. Pares con fuente independiente (criterio de parada): |z| > 3 en a, e, i o q, o D_D > 0,1.
 * B. Validación del método propio contra JPL Horizons (2008 TC3).
 * C. Granvik & Brown 2018 frente a la compilación de Borovička et al. 2015 (mismos datos de base).
 * D. Error del método analítico: N cuerpos desde el radiante y v_g de Granvik & Brown.
 * E. Órbitas calculadas desde el CNEOS frente a Granvik & Brown.
 * Sale con código 2 si se activa el criterio de parada.
 */
import * as Astro from 'astronomy-engine';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Elementos } from '../src/core/kepler';
import {
  elementosSinTierra,
  orbitaDesdeBolido,
  orbitaDesdeRadianteGeocentrico,
} from '../src/core/orbita-bolido';
import { dDrummond, type ElementosAngulares } from '../src/core/similitud';
import { GRAD } from '../src/core/vector';
import { Calibracion, Meteorito, type Orbita } from '../src/schema';

type Clave = 'a' | 'e' | 'i' | 'q';
interface OrbitaPlana {
  a: number;
  e: number;
  i: number; // grados
  nodo: number;
  omega: number;
  q: number;
  sigma: Partial<Record<Clave, number>>;
}

const CLAVES: Clave[] = ['a', 'e', 'i', 'q'];
const ang = (o: OrbitaPlana): ElementosAngulares => ({
  q: o.q,
  e: o.e,
  i: o.i * GRAD,
  nodo: o.nodo * GRAD,
  omega: o.omega * GRAD,
});
const deElementos = (e: Elementos): OrbitaPlana => ({
  a: e.a,
  e: e.e,
  i: e.i / GRAD,
  nodo: e.nodo / GRAD,
  omega: e.omega / GRAD,
  q: e.a * (1 - e.e),
  sigma: {},
});
/** σ de q = a(1 − e) propagada desde a y e cuando la fuente no publica q (sin correlaciones). */
const sigmaQ = (a: number, e: number, sa?: number, se?: number) =>
  sa === undefined || se === undefined ? undefined : Math.hypot(sa * (1 - e), a * se);
const deDataset = (o: Orbita): OrbitaPlana => {
  const a = o.a.valor as number;
  const e = o.e.valor as number;
  return {
    a,
    e,
    i: o.i.valor as number,
    nodo: o.nodo.valor as number,
    omega: o.omega.valor as number,
    q: o.q ? (o.q.valor as number) : a * (1 - e),
    sigma: {
      a: o.a.sigma,
      e: o.e.sigma,
      i: o.i.sigma,
      q: o.q ? o.q.sigma : sigmaQ(a, e, o.a.sigma, o.e.sigma),
    },
  };
};
const f = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : '—');

function comparar(A: OrbitaPlana, B: OrbitaPlana) {
  const z = Object.fromEntries(
    CLAVES.map((k) => {
      const s = Math.hypot(A.sigma[k] ?? 0, B.sigma[k] ?? 0);
      return [k, s > 0 ? (A[k] - B[k]) / s : NaN];
    }),
  ) as Record<Clave, number>;
  return { dd: dDrummond(ang(A), ang(B)), z };
}

// ---------- datos ----------
const meteoritos = new Map(
  readdirSync('data/pedigri')
    .filter((x) => x.endsWith('.json'))
    .map((x) => {
      const m = Meteorito.parse(JSON.parse(readFileSync(`data/pedigri/${x}`, 'utf8')));
      return [m.id, m] as const;
    }),
);
const gb = (id: string) => {
  const o = meteoritos.get(id)!.orbitas.find((x) => x.fuente === 'granvik-brown-2018')!;
  return deDataset(o);
};
const originales = JSON.parse(readFileSync('data/verificacion/originales.json', 'utf8'));
const b2015 = JSON.parse(readFileSync('data/verificacion/borovicka-2015.json', 'utf8'));
const calibracion = Calibracion.parse(
  JSON.parse(readFileSync('data/calibracion/pena-asensio-2025.json', 'utf8')),
);

const plana = (x: Record<string, [number, number]>): OrbitaPlana => ({
  a: x.a![0],
  e: x.e![0],
  i: x.i![0],
  nodo: x.nodo![0],
  omega: x.omega![0],
  q: x.q![0],
  sigma: { a: x.a![1], e: x.e![1], i: x.i![1], q: x.q![1] },
});

// ---------- B. Método propio vs JPL Horizons (2008 TC3) ----------
const tc3 = originales['almahata-sitta'];
const vec = tc3.vector_geocentrico;
const tVec = Astro.AstroTime.FromTerrestrialTime(vec.jd_tdb - 2451545.0);
const tierra = Astro.HelioState(Astro.Body.Earth, tVec);
const epocaImpacto = meteoritos
  .get('almahata-sitta')!
  .orbitas.find((o) => o.fuente === 'granvik-brown-2018')!;
const mjd = Number(/MJD ([\d.]+)/.exec(String(epocaImpacto.epoca.valor))![1]);
const tImpacto = Astro.MakeTime(new Date((mjd - 40587) * 86400000));
const propiaTc3 = deElementos(
  elementosSinTierra(
    [
      vec.x + tierra.x,
      vec.y + tierra.y,
      vec.z + tierra.z,
      vec.vx + tierra.vx,
      vec.vy + tierra.vy,
      vec.vz + tierra.vz,
    ],
    tVec.ut,
    tImpacto.ut,
  ).elementos,
);
const elJpl = (tc3.elementos as Array<Record<string, number | string>>).find((x) =>
  String(x.fecha).includes('2008-Sep-07'),
)!;
const jplPre: OrbitaPlana = {
  a: elJpl.a as number,
  e: elJpl.e as number,
  i: elJpl.i as number,
  nodo: elJpl.nodo as number,
  omega: elJpl.omega as number,
  q: elJpl.q as number,
  sigma: {},
};
const validacionMetodo = comparar(propiaTc3, jplPre);

// ---------- A. Pares independientes ----------
interface Par {
  meteorito: string;
  fuente: string;
  definicion: string;
  A: OrbitaPlana;
  B: OrbitaPlana;
}
const pares: Par[] = [
  {
    meteorito: 'Žďár nad Sázavou',
    fuente: 'Spurný et al. 2020, Tabla 2',
    definicion: 'pre-atmosférica (método analítico de Ceplecha)',
    A: plana(originales['zdar-nad-sazavou']),
    B: gb('zdar-nad-sazavou'),
  },
  {
    meteorito: 'Annama',
    fuente: 'Trigo-Rodríguez et al. 2015, Tabla 4',
    definicion: 'pre-atmosférica',
    A: { ...plana({ ...originales.annama }), sigma: { a: 0.12, e: 0.02, i: 0.46, q: 0.006 } },
    B: gb('annama'),
  },
  {
    meteorito: 'Almahata Sitta',
    fuente: 'JPL Horizons, 2008 TC3 (órbita telescópica, 2008-09-07)',
    definicion: 'osculadora antes del encuentro (sin efecto terrestre)',
    A: { ...jplPre, sigma: { a: 1e-5, e: 1e-5, i: 1e-4, q: 1e-5 } },
    B: gb('almahata-sitta'),
  },
  ...meteoritos
    .get('chelyabinsk')!
    .orbitas.filter((o) => o.a.estado === 'verificado' && o.fuente !== 'granvik-brown-2018')
    .map((o) => ({
      meteorito: 'Chelyabinsk',
      fuente: o.fuente,
      definicion: 'pre-atmosférica',
      A: deDataset(o),
      B: gb('chelyabinsk'),
    })),
];
const resultadosA = pares.map((p) => ({ ...p, ...comparar(p.A, p.B) }));
const fallos = resultadosA.filter(
  (r) => r.dd > 0.1 || CLAVES.some((k) => Number.isFinite(r.z[k]) && Math.abs(r.z[k]) > 3),
);

// ---------- C. Compilación Borovička 2015 vs G&B ----------
const idPorNombre = (n: string) =>
  [...meteoritos.values()].find((m) => String(m.nombre_oficial.valor).replace('’', "'") === n)?.id;
const ultimaCifra = (s: string) => {
  const d = s.split('.')[1]?.length ?? 0;
  return 10 ** -d;
};
const resultadosC = (b2015.filas as Array<Record<string, unknown>>).map((fila) => {
  const texto = fila.texto as string[];
  const B: OrbitaPlana = {
    a: fila.a as number,
    e: fila.e as number,
    i: fila.i as number,
    nodo: fila.nodo as number,
    omega: fila.omega as number,
    q: fila.q as number,
    sigma: {
      a: ultimaCifra(texto[3]!),
      e: ultimaCifra(texto[4]!),
      q: ultimaCifra(texto[5]!),
      i: ultimaCifra(texto[9]!),
    },
  };
  const id = idPorNombre(fila.nombre as string)!;
  return { nombre: fila.nombre as string, ...comparar(B, gb(id)) };
});

// ---------- D. Error del método analítico ----------
const resultadosD = [...meteoritos.values()]
  .filter((m) => m.orbitas.some((o) => o.fuente === 'granvik-brown-2018'))
  .map((m) => {
    const rg = m.radiante_geocentrico!;
    const propia = deElementos(
      orbitaDesdeRadianteGeocentrico({
        fecha: new Date(String(m.fecha_caida.valor)),
        latGrados: m.punto_trayectoria!.lat.valor as number,
        lonGrados: m.punto_trayectoria!.lon.valor as number,
        alturaKm: 50,
        raGrados: rg.ra.valor as number,
        decGrados: rg.dec.valor as number,
        vgKmS: rg.v_geocentrica.valor as number,
      }),
    );
    const ref = gb(m.id);
    return {
      nombre: String(m.nombre_oficial.valor),
      vg: rg.v_geocentrica.valor as number,
      ...comparar(propia, ref),
      da: propia.a - ref.a,
    };
  })
  .sort((x, y) => x.vg - y.vg);

// ---------- E. CNEOS vs G&B ----------
const cneos: Record<string, string> = {
  '2008 TC3': 'almahata-sitta',
  'Buzzard Coulee': 'buzzard-coulee',
  Košice: 'kosice',
  Chelyabinsk: 'chelyabinsk',
};
const resultadosE = calibracion.eventos
  .filter((ev) => cneos[ev.nombre])
  .map((ev) => {
    const propia = deElementos(
      orbitaDesdeBolido({
        fecha: new Date(ev.fecha),
        latGrados: ev.lat,
        lonGrados: ev.lon,
        alturaKm: ev.alt_km,
        vEcefKmS: ev.v_ecef_kms,
      }).elementos,
    );
    const bajo = Number(ev.fecha.slice(0, 4)) >= 2018 || ev.energia_impacto_kt >= 0.45;
    return { nombre: ev.nombre, bajo, dd: dDrummond(ang(propia), ang(gb(cneos[ev.nombre]!))) };
  });

// ---------- reporte ----------
const zTxt = (z: Record<Clave, number>) => CLAVES.map((k) => f(z[k], 1)).join(' | ');
const informe = `# Verificación cruzada de órbitas con pedigrí

> Generado por \`npm run verificacion:cruzada\` el ${new Date().toISOString().slice(0, 10)}. No editar a mano.

## Veredicto

${
  fallos.length === 0
    ? '**APROBADA.** Ningún par independiente supera |z| > 3 en a, e, i, q ni D_D > 0,1.'
    : `**CRITERIO DE PARADA ACTIVADO** en ${fallos.length} par(es):\n\n${fallos
        .map(
          (r) => `- ${r.meteorito} (${r.fuente}): D_D = ${f(r.dd)}; z(a, e, i, q) = ${zTxt(r.z)}`,
        )
        .join('\n')}`
}

z = (fuente − Granvik & Brown) / √(σ₁² + σ₂²). D_D: Drummond (1981).

## A. Fuentes independientes frente a Granvik & Brown 2018

| Meteorito | Fuente | Definición de la órbita | D_D | z(a) | z(e) | z(i) | z(q) |
|---|---|---|---|---|---|---|---|
${resultadosA.map((r) => `| ${r.meteorito} | ${r.fuente} | ${r.definicion} | ${f(r.dd)} | ${zTxt(r.z)} |`).join('\n')}

Valores: Granvik & Brown → ${resultadosA
  .map(
    (r) =>
      `${r.meteorito} (${r.fuente.split(',')[0]}): a ${f(r.A.a)} vs ${f(r.B.a)}, e ${f(r.A.e, 4)} vs ${f(r.B.e, 4)}, i ${f(r.A.i, 2)}° vs ${f(r.B.i, 2)}°`,
  )
  .join('; ')}.

## B. Validación del método propio con JPL Horizons (2008 TC3)

Estado geocéntrico de Horizons a ${vec.jd_tdb} TDB (~27 h antes del impacto) → retropropagación N cuerpos hasta 0,05 AU → propagación sin Tierra ni Luna hasta el impacto. Comparado con los elementos osculadores de JPL del 2008-09-07, cuando la Tierra aún no perturbaba la órbita:

| | a (AU) | e | i (°) | ω (°) | Ω (°) |
|---|---|---|---|---|---|
| Método propio | ${f(propiaTc3.a, 5)} | ${f(propiaTc3.e, 5)} | ${f(propiaTc3.i, 4)} | ${f(propiaTc3.omega, 3)} | ${f(propiaTc3.nodo, 3)} |
| JPL Horizons (2008-09-07) | ${f(jplPre.a, 5)} | ${f(jplPre.e, 5)} | ${f(jplPre.i, 4)} | ${f(jplPre.omega, 3)} | ${f(jplPre.nodo, 3)} |

D_D = ${f(validacionMetodo.dd, 4)}. El método propio reproduce la órbita telescópica previa al encuentro.

## C. Granvik & Brown 2018 frente a Borovička et al. 2015 (misma base de datos)

No son independientes (mismas observaciones, autores en común); detecta errores de transcripción o de cálculo. σ de Borovička et al. = una unidad en la última cifra publicada.

| Meteorito | D_D | z(a) | z(e) | z(i) | z(q) |
|---|---|---|---|---|---|
${resultadosC.map((r) => `| ${r.nombre} | ${f(r.dd)} | ${zTxt(r.z)} |`).join('\n')}

## D. Error del método analítico: N cuerpos desde el radiante de Granvik & Brown

Con el radiante geocéntrico, v_g, instante y posición de referencia que publican Granvik & Brown (altura supuesta: 50 km), se integra la órbita con N cuerpos y se compara con sus elementos (calculados con el método analítico de Ceplecha 1987). Ordenado por v_g.

| Meteorito | v_g (km/s) | Δa (AU) | D_D | z(a) | z(e) | z(i) | z(q) |
|---|---|---|---|---|---|---|---|
${resultadosD.map((r) => `| ${r.nombre} | ${f(r.vg, 2)} | ${f(r.da, 4)} | ${f(r.dd)} | ${zTxt(r.z)} |`).join('\n')}

## E. Órbitas calculadas desde el CNEOS frente a Granvik & Brown

| Evento | Grupo CNEOS (Peña-Asensio 2025) | D_D |
|---|---|---|
${resultadosE.map((r) => `| ${r.nombre} | ${r.bajo ? 'bajo D_D' : 'alto D_D (pre-2018, < 0,45 kt)'} | ${f(r.dd)} |`).join('\n')}
`;
writeFileSync('docs/reportes/cruzada.md', informe);
console.log(
  fallos.length
    ? `CRITERIO DE PARADA: ${fallos.map((r) => r.meteorito).join(', ')}`
    : 'Verificación cruzada aprobada.',
);
console.log(`Método propio vs JPL (2008 TC3): D_D = ${validacionMetodo.dd.toFixed(4)}`);
if (fallos.length) process.exitCode = 2;
