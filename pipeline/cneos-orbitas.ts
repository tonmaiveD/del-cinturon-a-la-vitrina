/**
 * CLI: `npm run datos:cneos:orbitas`.
 * A partir de data/cneos/eventos.json:
 * - public/data/cneos/eventos.json: todos los eventos, con su calidad y, si tienen órbita, un
 *   resumen estadístico de la nube (percentiles 16, 50 y 84).
 * - public/data/cneos/orbitas/<id>.json: órbita nominal y clones Monte Carlo de cada evento del
 *   grupo de bajo D_D (σ = mediana / 0,6745 de la Tabla 4 de Peña-Asensio et al. 2025, como en
 *   la validación de Chelyabinsk). Incremental: solo se recalcula si cambia la huella de entrada.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { leerEventos } from '../src/cneos/eventos';
import type { OrbitaCalculada, OrbitaCneos, ResumenCneos } from '../src/cneos/resumen';
import { CalidadCneos, RespuestaCneos } from '../src/schema';
import { calcularOrbita, huellaEvento, r6 } from './cneos-calculo';
import { metodoCneos } from './cneos-metodo';

const DIR = 'public/data/cneos';
const DIR_ORBITAS = `${DIR}/orbitas`;

const crudo = RespuestaCneos.parse(JSON.parse(readFileSync('data/cneos/eventos.json', 'utf8')));
const tabla4 = CalidadCneos.parse(
  JSON.parse(readFileSync('data/calibracion/pena-asensio-2025-tabla4.json', 'utf8')),
);

/**
 * Método (M18): huella del código del cálculo (`pipeline/cneos-calculo.ts` y lo que ejecuta),
 * efemérides y parámetros. Si cambia, todas las órbitas guardadas se recalculan solas.
 */
const METODO = metodoCneos(tabla4);

const eventos = leerEventos(crudo.respuesta);
mkdirSync(DIR_ORBITAS, { recursive: true });

function percentiles(xs: number[]): [number, number, number] | null {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const p = (q: number) => r6(o[Math.min(o.length - 1, Math.floor(q * o.length))]!);
  return [p(0.16), p(0.5), p(0.84)];
}

function resumenOrbita(o: OrbitaCneos): ResumenCneos['eventos'][number]['orbita'] {
  if ('error' in o) return { error: o.error };
  return { radiante: o.radiante, ...estadisticas(o) };
}

function estadisticas(o: OrbitaCalculada) {
  const el = o.clones.filter((c) => c[1]! < 1);
  const q = o.clones.map((c) => c[0]! * (1 - c[1]!));
  return {
    n: o.clones.length,
    descartados: o.metodo.clones_fallidos,
    hiperbolicas: o.clones.length - el.length,
    a: percentiles(el.map((c) => c[0]!)),
    e: percentiles(o.clones.map((c) => c[1]!)),
    i: percentiles(o.clones.map((c) => c[2]!)),
    q: percentiles(q),
  };
}

/**
 * Reparto opcional en procesos paralelos: CNEOS_FRAGMENTO=k/n calcula solo los eventos con
 * órbita de índice ≡ k (mód n) y no escribe el resumen; una pasada final sin la variable
 * reutiliza lo calculado y escribe el resumen.
 */
const fragmento = process.env.CNEOS_FRAGMENTO?.split('/').map(Number);

const usados = new Set<string>();
let calculados = 0;
let reutilizados = 0;
const conOrbita = eventos.filter((e) => e.calidad === 'orbita');
const t0 = Date.now();
const salida: ResumenCneos['eventos'] = [];
for (const ev of eventos) {
  const fila: ResumenCneos['eventos'][number] = { ...ev };
  if (ev.calidad === 'orbita') {
    if (fragmento && conOrbita.indexOf(ev) % fragmento[1]! !== fragmento[0]) continue;
    const ruta = `${DIR_ORBITAS}/${ev.id}.json`;
    usados.add(`${ev.id}.json`);
    let o: OrbitaCneos | undefined;
    if (existsSync(ruta)) {
      const previa = JSON.parse(readFileSync(ruta, 'utf8')) as OrbitaCneos;
      if (previa.huella === huellaEvento(ev, METODO)) o = previa;
    }
    if (o) reutilizados++;
    else {
      o = calcularOrbita(ev, METODO);
      writeFileSync(ruta, JSON.stringify(o));
      calculados++;
      if (calculados % 10 === 0)
        console.log(
          `  ${calculados + reutilizados}/${conOrbita.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`,
        );
    }
    fila.orbita = resumenOrbita(o);
  }
  salida.push(fila);
}
if (fragmento) {
  console.log(
    `Fragmento ${fragmento.join('/')}: ${calculados} calculadas, ${reutilizados} reutilizadas.`,
  );
  process.exit(0);
}
// Órbitas de eventos que ya no están en la API (o que cambiaron de grupo)
for (const f of readdirSync(DIR_ORBITAS)) if (!usados.has(f)) rmSync(`${DIR_ORBITAS}/${f}`);

const resumen: ResumenCneos = {
  fuente: crudo.fuente,
  consultado: crudo.consultado,
  version_api: crudo.respuesta.signature.version,
  ultimo_evento: eventos.reduce((m, e) => (e.fecha > m ? e.fecha : m), ''),
  criterio: {
    fuente: tabla4.fuente,
    corte_fecha: '2018-01-01T00:00:00Z',
    umbral_kt: 0.45,
    alto_dd: tabla4.grupos.find((g) => g.id === 'alto-dd')!,
  },
  conteos: Object.fromEntries(
    (['orbita', 'orbita-no-fiable', 'sin-altura', 'sin-vector', 'sin-ubicacion'] as const).map(
      (c) => [c, eventos.filter((e) => e.calidad === c).length],
    ),
  ) as ResumenCneos['conteos'],
  eventos: salida,
};
writeFileSync(`${DIR}/eventos.json`, JSON.stringify(resumen));
console.log(
  `CNEOS: ${eventos.length} eventos; órbitas calculadas ${calculados}, reutilizadas ${reutilizados}.`,
  resumen.conteos,
);
