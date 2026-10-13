/**
 * CLI: `npm run datos:trayectoria`.
 * public/data/chelyabinsk-trayectoria.json: trayectoria N cuerpos del año previo de Chelyabinsk
 * calculada como describen Popova et al. 2013 (material suplementario, págs. 17–18): desde su
 * radiante aparente y su velocidad de entrada, en su punto e instante de entrada (97,1 km),
 * corrigiendo la rotación terrestre; validada contra su órbita con el criterio de las demás
 * piezas. Así toda la figura sale de una sola fuente (decisión del 2026-10-12). Tiempos en días
 * relativos a `instante_referencia`. La nube sale de `npm run datos:nubes`.
 *
 * El cálculo desde el vector del CNEOS sigue en `npm run validacion:chelyabinsk`, como
 * validación independiente (docs/reportes/chelyabinsk.md); no se dibuja en el recorrido.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Meteorito } from '../src/schema';
import { calcularDesdeEntrada } from './trayectorias-pedigri';

const m = Meteorito.parse(JSON.parse(readFileSync('data/pedigri/chelyabinsk.json', 'utf8')));

// ---------- trayectoria del año previo ----------
const tr = calcularDesdeEntrada(m);
const v = tr.validacion;
console.log(
  `Trayectoria: D_D ${v.dd} · z(a) ${v.z.a} z(e) ${v.z.e} z(i) ${v.z.i} frente a ${v.fuente_orbita} · ${v.aprobada ? 'aprobada' : 'RECHAZADA'}`,
);
if (!v.aprobada) {
  console.error('Criterio de parada: la trayectoria no reproduce la órbita principal.');
  process.exit(2);
}

mkdirSync('public/data', { recursive: true });
writeFileSync(
  'public/data/chelyabinsk-trayectoria.json',
  JSON.stringify({
    ...tr,
    nota: `Radiante aparente, velocidad, punto e instante de entrada de ${tr.radiante_aparente!.fuente}. dt en días respecto a instante_referencia.`,
  }) + '\n',
);
console.log(
  `Trayectoria: ${tr.helio_ecl_au.length} muestras heliocéntricas, ${tr.geo_eqj_km.length} geocéntricas.`,
);
