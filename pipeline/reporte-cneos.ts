/**
 * CLI: `npm run reporte:cneos` → docs/reportes/cneos.md.
 * Control de calidad de los datos y las órbitas del CNEOS (requiere `datos:cneos:orbitas`).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { grupoBajoDd } from '../src/cneos/eventos';
import type { OrbitaCalculada, OrbitaCneos, ResumenCneos } from '../src/cneos/resumen';
import { Calibracion } from '../src/schema';

const leer = <T>(r: string) => JSON.parse(readFileSync(r, 'utf8')) as T;
const resumen = leer<ResumenCneos>('public/data/cneos/eventos.json');
const cal = Calibracion.parse(leer('data/calibracion/pena-asensio-2025.json'));
const f = (x: number, d = 2) =>
  x.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (a: number, b: number) => `${f((100 * a) / b, 1)} %`;

const conOrbita = resumen.eventos.filter((e) => e.calidad === 'orbita');
const todas = conOrbita.map((e) => leer<OrbitaCneos>(`public/data/cneos/orbitas/${e.id}.json`));
const orbitas = todas.filter((o): o is OrbitaCalculada => !('error' in o));
const sinCalcular = todas.filter((o) => 'error' in o);
const conNube = conOrbita.filter((e) => e.orbita && !('error' in e.orbita));
const nominalHiperbolica = orbitas.filter((o) => o.nominal[1]! >= 1);
const muchosFallidos = orbitas.filter(
  (o) => o.metodo.clones_fallidos > 0.1 * o.metodo.clones_pedidos,
);
const fallidos = orbitas.reduce((s, o) => s + o.metodo.clones_fallidos, 0);
const resumenDe = (e: (typeof conNube)[number]) =>
  e.orbita as Exclude<typeof e.orbita, { error: string } | undefined>;
const mayoriaHip = conNube.filter((e) => resumenDe(e).hiperbolicas / resumenDe(e).n > 0.5);
const porAnio = new Map<string, number>();
for (const e of conOrbita)
  porAnio.set(e.fecha.slice(0, 4), (porAnio.get(e.fecha.slice(0, 4)) ?? 0) + 1);
const c = resumen.conteos;
const total = resumen.eventos.length;
const m = orbitas[0]!.metodo;

const lineas = [
  '# Bólidos del CNEOS: datos y órbitas (Fase 3, etapa 1)',
  '',
  `Generado por \`npm run reporte:cneos\`. Consulta de la API: ${resumen.consultado} (versión ${resumen.version_api}); evento más reciente: ${resumen.ultimo_evento}.`,
  '',
  '## Eventos por calidad',
  '',
  '| Clase | Eventos | % | Qué se muestra |',
  '| --- | --- | --- | --- |',
  `| Con órbita (grupo de bajo D_D) | ${c.orbita} | ${pct(c.orbita, total)} | posición, energía, trayectoria y nube de órbitas |`,
  `| Vector, grupo de alto D_D | ${c['orbita-no-fiable']} | ${pct(c['orbita-no-fiable'], total)} | posición, energía y trayectoria; sin órbita (decisión del 2026-10-06) |`,
  `| Vector sin altura | ${c['sin-altura']} | ${pct(c['sin-altura'], total)} | posición y energía; sin trayectoria ni órbita |`,
  `| Ubicación sin vector | ${c['sin-vector']} | ${pct(c['sin-vector'], total)} | posición y energía |`,
  `| Sin ubicación | ${c['sin-ubicacion']} | ${pct(c['sin-ubicacion'], total)} | solo en listas (fecha y energía) |`,
  `| **Total** | ${total} | | |`,
  '',
  '## Criterio de fiabilidad',
  '',
  'Peña-Asensio et al. 2025, Tabla 4: grupo de bajo D_D si el año es ≥ 2018 o la energía de impacto es ≥ 0,45 kt. Con los 18 eventos calibrados la regla es **conservadora**:',
  '',
  '| Evento | Fecha | E_i (kt) | D_D publicado | Grupo por la regla |',
  '| --- | --- | --- | --- | --- |',
  ...cal.eventos.map(
    (e) =>
      `| ${e.nombre} | ${e.fecha.slice(0, 10)} | ${f(e.energia_impacto_kt)} | ${f(e.ref.dd, 3)} | ${grupoBajoDd(e.fecha, e.energia_impacto_kt) ? 'bajo D_D (órbita)' : 'alto D_D (sin órbita)'}${grupoBajoDd(e.fecha, e.energia_impacto_kt) !== e.ref.dd < 0.1 ? ' ⚠' : ''} |`,
  ),
  '',
  'Ningún evento clasificado como fiable tiene D_D ≥ 0,1. Dos eventos del grupo «sin órbita» (⚠) tienen en realidad buena órbita: el grupo significa «no verificable de antemano», no «erróneo».',
  '',
  `Errores medianos del grupo de alto D_D (Tabla 4): velocidad ${f(resumen.criterio.alto_dd.v_kms.mediana)} km/s, α_g ${f(resumen.criterio.alto_dd.alfa_g_grados.mediana)}°, δ_g ${f(resumen.criterio.alto_dd.delta_g_grados.mediana)}°, a ${f(resumen.criterio.alto_dd.a_au.mediana)} AU, ω ${f(resumen.criterio.alto_dd.omega_grados.mediana)}°.`,
  '',
  '## Monte Carlo',
  '',
  `${m.clones_pedidos} clones por evento, σ_v = ${f(m.sigma.v_kms, 3)} km/s, σ_α = ${f(m.sigma.alfa_grados, 3)}°, σ_δ = ${f(m.sigma.delta_grados, 3)}° (medianas de la Tabla 4 / 0,6745, igual que en la validación de Chelyabinsk), semilla derivada del id del evento. Retropropagación N cuerpos hasta 0,05 AU (método validado en la Fase 1).`,
  '',
  `- Eventos sin órbita calculable: ${sinCalcular.length}${sinCalcular.length ? ` (${sinCalcular.map((o) => `${o.id}: ${'error' in o ? o.error : ''}`).join('; ')})` : ''}. La retropropagación no sale de la influencia terrestre en 60 días: velocidad geocéntrica muy baja, sin solución heliocéntrica con este método. Se muestran sin órbita, con el motivo.`,
  `- Clones descartados porque su integración falló: ${fallidos} de ${orbitas.length * m.clones_pedidos}. Eventos con más del 10 % de clones descartados: ${muchosFallidos.length}${muchosFallidos.length ? ` (${muchosFallidos.map((o) => `${o.id}: ${o.metodo.clones_fallidos}`).join('; ')})` : ''}. En ellos la nube puede estar sesgada hacia las soluciones que sí convergen.`,
  `- Eventos cuya órbita nominal es hiperbólica (e ≥ 1): ${nominalHiperbolica.length} de ${orbitas.length}.`,
  `- Eventos con más de la mitad de los clones hiperbólicos: ${mayoriaHip.length}${mayoriaHip.length ? ` (${mayoriaHip.map((e) => `${e.fecha.slice(0, 10)}, ${f(e.v_kms ?? NaN, 1)} km/s`).join('; ')})` : ''}.`,
  '',
  'Una órbita hiperbólica calculada a partir del CNEOS no se interpreta aquí: puede ser consecuencia del error de la velocidad publicada. La escena la mostrará como hiperbólica, sin más lectura.',
  '',
  '## Eventos con órbita por año',
  '',
  '| Año | Eventos |',
  '| --- | --- |',
  ...[...porAnio].sort().map(([a, n]) => `| ${a} | ${n} |`),
  '',
];
writeFileSync('docs/reportes/cneos.md', lineas.join('\n'));
console.log('docs/reportes/cneos.md escrito.');
