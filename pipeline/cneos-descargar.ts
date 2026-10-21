/**
 * CLI: `npm run datos:cneos:descargar` → data/cneos/eventos.json.
 * Guarda la respuesta cruda completa de la API Fireball (con componentes de velocidad) y la
 * fecha de consulta. No se modifica nada: el procesamiento está en cneos-orbitas.ts.
 *
 * Además, cada consulta válida, traiga o no cambios, queda en public/data/cneos/consulta.json
 * (M17): la web distingue la última consulta del último cambio, y la vigilancia diaria
 * (pipeline/vigilancia.ts) avisa si deja de haber consultas.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { validarRespuesta } from '../src/cneos/contrato';
import { RespuestaCneos } from '../src/schema';

const URL_API = 'https://ssd-api.jpl.nasa.gov/fireball.api?vel-comp=true';
const DESTINO = 'data/cneos/eventos.json';
const CONSULTA = 'public/data/cneos/consulta.json';

const r = await fetch(URL_API);
if (!r.ok) throw new Error(`API CNEOS: ${r.status} ${r.statusText}`);
const respuesta = (await r.json()) as RespuestaCneos['respuesta'];

// Solo se reescribe si cambian los datos: la fecha de consulta sola no es un cambio
let anterior: RespuestaCneos | undefined;
try {
  anterior = RespuestaCneos.parse(JSON.parse(readFileSync(DESTINO, 'utf8')));
} catch {
  anterior = undefined;
}

// Contrato de entrada (M08): si la respuesta no lo cumple no se guarda nada y se conserva el
// último conjunto válido; el workflow falla con el motivo
const { errores, advertencias } = validarRespuesta(respuesta, anterior?.respuesta);
for (const a of advertencias) console.warn(`Advertencia: ${a}`);
if (errores.length) {
  console.error(`Respuesta del CNEOS rechazada (${errores.length} problemas):`);
  for (const e of errores.slice(0, 30)) console.error(`  - ${e}`);
  process.exit(1);
}
const ahora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const sinCambios = !!anterior && JSON.stringify(anterior.respuesta) === JSON.stringify(respuesta);
mkdirSync('public/data/cneos', { recursive: true });
writeFileSync(
  CONSULTA,
  JSON.stringify(
    { consultado: ahora, con_cambios: !sinCambios, eventos: Number(respuesta.count) },
    null,
    1,
  ) + '\n',
);
if (sinCambios) {
  console.log(`CNEOS sin cambios (${respuesta.count} eventos).`);
} else {
  const nuevo = RespuestaCneos.parse({
    fuente: 'cneos-fireball-api',
    url: URL_API,
    consultado: ahora,
    respuesta,
  });
  writeFileSync(DESTINO, JSON.stringify(nuevo, null, 1) + '\n');
  const antes = anterior ? Number(anterior.respuesta.count) : 0;
  console.log(`CNEOS actualizado: ${respuesta.count} eventos (antes ${antes}).`);
}
