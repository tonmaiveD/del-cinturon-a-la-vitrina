/** CLI: `npm run validate`. Falla el build si el dataset no es válido. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validarDataset } from './validar';

const leer = (ruta: string): unknown => JSON.parse(readFileSync(ruta, 'utf8'));
const dirPedigri = 'data/pedigri';

const errores = validarDataset({
  fuentes: leer('data/fuentes.json'),
  regiones: leer('data/regiones-origen.json'),
  escape: leer('data/regiones-escape.json'),
  cneos: {
    eventos: leer('data/cneos/eventos.json'),
    calidad: leer('data/calibracion/pena-asensio-2025-tabla4.json'),
  },
  pedigri: readdirSync(dirPedigri)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ ruta: join(dirPedigri, f), contenido: leer(join(dirPedigri, f)) })),
});

if (errores.length) {
  console.error(`Dataset inválido (${errores.length} errores):\n- ${errores.join('\n- ')}`);
  process.exit(1);
}
console.log('Dataset válido.');
