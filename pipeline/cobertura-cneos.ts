/**
 * CLI: `npm run validacion:cobertura` → docs/reportes/cobertura-cneos.md (M09).
 *
 * ¿Cubre la nube de órbitas lo que pretende cubrir? Para cada evento calibrado de Peña-Asensio
 * et al. (2025) del grupo fiable (año ≥ 2018 o ≥ 0,45 kt) se generan clones con los errores de
 * la Tabla 4 y se mira si la órbita medida desde tierra («ref») cae dentro del rango central del
 * 68 % y del 95 % de los clones, en a, e, i y q. Se comparan dos métodos:
 * - «anterior»: errores aplicados a la dirección del vector aparente en ejes ECEF (hasta el
 *   2026-10-12);
 * - «actual»: errores aplicados al radiante geocéntrico y a la velocidad de entrada.
 * Limitación: los mismos eventos sirvieron para medir esos errores (validación dentro de la
 * muestra) y son pocos; el resultado orienta, no certifica una probabilidad calibrada.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { crearAzar } from '../src/core/azar';
import { grupoBajoDd } from '../src/cneos/eventos';
import {
  orbitaDeRadiante,
  radiantePerturbado,
  type IncertidumbreVelocidad,
} from '../src/core/montecarlo';
import { orbitaDesdeBolido, type RegistroBolido } from '../src/core/orbita-bolido';
import { GRAD, norma, type Vec3 } from '../src/core/vector';
import { Calibracion, CalidadCneos } from '../src/schema';

const N = 200;
const SEMILLA = 20251012;
const MAD_A_SIGMA = 1 / 0.6744897501960817;
const leer = (r: string) => JSON.parse(readFileSync(r, 'utf8')) as unknown;
const cal = Calibracion.parse(leer('data/calibracion/pena-asensio-2025.json'));
const bajo = CalidadCneos.parse(leer('data/calibracion/pena-asensio-2025-tabla4.json')).grupos.find(
  (g) => g.id === 'bajo-dd',
)!;
const INC: IncertidumbreVelocidad = {
  sigmaV: bajo.v_kms.mediana * MAD_A_SIGMA,
  sigmaRaGrados: bajo.alfa_g_grados.mediana * MAD_A_SIGMA,
  sigmaDecGrados: bajo.delta_g_grados.mediana * MAD_A_SIGMA,
};

/** Método anterior, conservado solo para esta comparación. */
function perturbarVectorEcef(v: Vec3, normal: () => number): Vec3 {
  const m = norma(v);
  const ra = Math.atan2(v[1], v[0]);
  const dec = Math.asin(v[2] / m);
  const m2 = m + normal() * INC.sigmaV;
  const ra2 = ra + normal() * INC.sigmaRaGrados * GRAD;
  const dec2 = dec + normal() * INC.sigmaDecGrados * GRAD;
  return [
    m2 * Math.cos(dec2) * Math.cos(ra2),
    m2 * Math.cos(dec2) * Math.sin(ra2),
    m2 * Math.sin(dec2),
  ];
}

type Clave = 'a' | 'e' | 'i' | 'q';
const CLAVES: Clave[] = ['a', 'e', 'i', 'q'];
type Orb = Record<Clave, number>;

function nube(reg: RegistroBolido, metodo: 'anterior' | 'actual'): Orb[] {
  const { normal } = crearAzar(SEMILLA);
  const out: Orb[] = [];
  for (let k = 0; k < N; k++) {
    try {
      const el =
        metodo === 'actual'
          ? orbitaDeRadiante(radiantePerturbado(reg, INC, normal)).elementos
          : orbitaDesdeBolido({ ...reg, vEcefKmS: perturbarVectorEcef(reg.vEcefKmS, normal) })
              .elementos;
      out.push({ a: el.a, e: el.e, i: el.i / GRAD, q: el.a * (1 - el.e) });
    } catch {
      // clon sin órbita: se descarta, como en el pipeline
    }
  }
  return out;
}

function dentro(xs: number[], valor: number, nivel: number): boolean {
  const o = [...xs].sort((a, b) => a - b);
  const p = (q: number) => o[Math.min(o.length - 1, Math.max(0, Math.floor(q * o.length)))]!;
  const cola = (1 - nivel) / 2;
  return valor >= p(cola) && valor <= p(1 - cola);
}

interface Fila {
  nombre: string;
  fecha: string;
  kt: number;
  clones: Record<'anterior' | 'actual', number>;
  en68: Record<'anterior' | 'actual', Clave[]>;
  en95: Record<'anterior' | 'actual', Clave[]>;
}

const filas: Fila[] = [];
const enGrupo = cal.eventos.filter((ev) => grupoBajoDd(ev.fecha, ev.energia_impacto_kt));
for (const ev of enGrupo) {
  const reg: RegistroBolido = {
    fecha: new Date(ev.fecha),
    latGrados: ev.lat,
    lonGrados: ev.lon,
    alturaKm: ev.alt_km,
    vEcefKmS: ev.v_ecef_kms,
  };
  const ref: Orb = { a: ev.ref.a, e: ev.ref.e, i: ev.ref.i, q: ev.ref.a * (1 - ev.ref.e) };
  const fila: Fila = {
    nombre: ev.nombre,
    fecha: ev.fecha.slice(0, 10),
    kt: ev.energia_impacto_kt,
    clones: { anterior: 0, actual: 0 },
    en68: { anterior: [], actual: [] },
    en95: { anterior: [], actual: [] },
  };
  for (const metodo of ['anterior', 'actual'] as const) {
    const n = nube(reg, metodo);
    fila.clones[metodo] = n.length;
    for (const k of CLAVES) {
      // a solo con órbitas elípticas, como en el panel
      const xs = (k === 'a' ? n.filter((o) => o.e < 1) : n).map((o) => o[k]);
      if (xs.length && dentro(xs, ref[k], 0.68)) fila.en68[metodo].push(k);
      if (xs.length && dentro(xs, ref[k], 0.95)) fila.en95[metodo].push(k);
    }
  }
  filas.push(fila);
  console.log(
    `${ev.nombre}: 68 % ${fila.en68.anterior.length}/4 → ${fila.en68.actual.length}/4; 95 % ${fila.en95.anterior.length}/4 → ${fila.en95.actual.length}/4`,
  );
}

const total = filas.length * CLAVES.length;
const suma = (m: 'anterior' | 'actual', banda: 'en68' | 'en95') =>
  filas.reduce((s, f) => s + f[banda][m].length, 0);
const pct = (x: number) =>
  `${((100 * x) / total).toLocaleString('es', { maximumFractionDigits: 0 })} %`;
const lista = (ks: Clave[]) => (ks.length ? ks.join(', ') : 'ninguno');

const md = `# Cobertura de las nubes de órbitas del CNEOS

Generado por \`npm run validacion:cobertura\` (\`pipeline/cobertura-cneos.ts\`). ${N} clones por evento y método, semilla fija.

La nube de cada bólido se construye con los errores típicos de la Tabla 4 de Peña-Asensio et al. (2025) para el grupo fiable (σ = mediana / 0,6745): velocidad ${INC.sigmaV.toFixed(3)} km/s, α_g ${INC.sigmaRaGrados.toFixed(3)}°, δ_g ${INC.sigmaDecGrados.toFixed(3)}°. Aquí se comprueba, con los eventos calibrados del mismo estudio que pertenecen a ese grupo (${filas.length} de ${cal.eventos.length}), si la órbita medida desde tierra cae dentro del rango central del 68 % y del 95 % de los clones en a, e, i y q.

## Resultado

| Método | Dentro del 68 % | Dentro del 95 % |
| --- | --- | --- |
| Anterior: errores sobre el vector aparente (ECEF) | ${suma('anterior', 'en68')}/${total} (${pct(suma('anterior', 'en68'))}) | ${suma('anterior', 'en95')}/${total} (${pct(suma('anterior', 'en95'))}) |
| Actual: errores sobre el radiante geocéntrico | ${suma('actual', 'en68')}/${total} (${pct(suma('actual', 'en68'))}) | ${suma('actual', 'en95')}/${total} (${pct(suma('actual', 'en95'))}) |

Si las nubes estuvieran bien calibradas, cabría esperar alrededor del 68 % y del 95 %.

## Por evento

| Evento | Fecha | kt | Clones (anterior / actual) | 68 % anterior | 68 % actual | 95 % anterior | 95 % actual |
| --- | --- | --- | --- | --- | --- | --- | --- |
${filas
  .map(
    (f) =>
      `| ${f.nombre} | ${f.fecha} | ${f.kt} | ${f.clones.anterior} / ${f.clones.actual} | ${lista(f.en68.anterior)} | ${lista(f.en68.actual)} | ${lista(f.en95.anterior)} | ${lista(f.en95.actual)} |`,
  )
  .join('\n')}

## Cómo leerlo

- Es una validación dentro de la muestra: estos mismos eventos sirvieron para medir los errores típicos, y son pocos. Orienta sobre si la nube es razonable; no certifica que el rango sea una probabilidad calibrada para un evento concreto.
- Los elementos a, e, i y q de un mismo evento no son independientes, así que los ${total} casos no son ${total} pruebas independientes.
- Los vectores son los de la revisión del CNEOS que usaron los autores, que puede diferir de la actual.
- Por todo ello la web describe el rango como «el 68 % central de las órbitas de este modelo», no como la probabilidad de la órbita real.
`;
writeFileSync('docs/reportes/cobertura-cneos.md', md);
console.log(
  `Cobertura 68 %: anterior ${suma('anterior', 'en68')}/${total}, actual ${suma('actual', 'en68')}/${total}; 95 %: ${suma('anterior', 'en95')}/${total} → ${suma('actual', 'en95')}/${total}`,
);
