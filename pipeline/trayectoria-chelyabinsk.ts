/**
 * CLI: `npm run datos:trayectoria`.
 * public/data/chelyabinsk-trayectoria.json: trayectoria N cuerpos del año previo de Chelyabinsk,
 * desde el radiante geocéntrico y v_g de su órbita principal (Popova et al. 2013) en la posición
 * de referencia de Granvik & Brown (con su instante), validada contra la órbita de Popova con el
 * criterio de las demás piezas (decisión del 2026-10-12). Tiempos en días relativos a
 * `instante_referencia`. La nube de órbitas sale de `npm run datos:nubes`.
 *
 * El cálculo desde el vector del CNEOS sigue en `npm run validacion:chelyabinsk`, como
 * validación independiente (docs/reportes/chelyabinsk.md); no se dibuja en el recorrido.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Meteorito } from '../src/schema';
import { calcularPieza } from './trayectorias-pedigri';

const m = Meteorito.parse(JSON.parse(readFileSync('data/pedigri/chelyabinsk.json', 'utf8')));

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

mkdirSync('public/data', { recursive: true });
writeFileSync(
  'public/data/chelyabinsk-trayectoria.json',
  JSON.stringify({
    ...tr,
    nota: `Radiante y v_g de ${tr.radiante!.fuente}; posición e instante de referencia de ${m.punto_trayectoria!.lat.fuente}, altura convencional. dt en días respecto a instante_referencia.`,
  }) + '\n',
);
console.log(
  `Trayectoria: ${tr.helio_ecl_au.length} muestras heliocéntricas, ${tr.geo_eqj_km.length} geocéntricas.`,
);
