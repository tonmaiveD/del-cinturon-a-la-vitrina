/**
 * CLI: `npm run datos:cneos:descargar` → data/cneos/eventos.json.
 * Guarda la respuesta cruda completa de la API Fireball (con componentes de velocidad) y la
 * fecha de consulta. No se modifica nada: el procesamiento está en cneos-orbitas.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { RespuestaCneos } from '../src/schema';

const URL_API = 'https://ssd-api.jpl.nasa.gov/fireball.api?vel-comp=true';
const DESTINO = 'data/cneos/eventos.json';

const r = await fetch(URL_API);
if (!r.ok) throw new Error(`API CNEOS: ${r.status} ${r.statusText}`);
const respuesta = (await r.json()) as RespuestaCneos['respuesta'];
if (!respuesta.fields?.includes('vx') || !Array.isArray(respuesta.data))
  throw new Error('Respuesta CNEOS inesperada (faltan campos o datos)');

// Solo se reescribe si cambian los datos: la fecha de consulta sola no es un cambio
let anterior: RespuestaCneos | undefined;
try {
  anterior = RespuestaCneos.parse(JSON.parse(readFileSync(DESTINO, 'utf8')));
} catch {
  anterior = undefined;
}
if (anterior && JSON.stringify(anterior.respuesta) === JSON.stringify(respuesta)) {
  console.log(`CNEOS sin cambios (${respuesta.count} eventos).`);
} else {
  const nuevo = RespuestaCneos.parse({
    fuente: 'cneos-fireball-api',
    url: URL_API,
    consultado: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    respuesta,
  });
  writeFileSync(DESTINO, JSON.stringify(nuevo, null, 1) + '\n');
  const antes = anterior ? Number(anterior.respuesta.count) : 0;
  console.log(`CNEOS actualizado: ${respuesta.count} eventos (antes ${antes}).`);
}
