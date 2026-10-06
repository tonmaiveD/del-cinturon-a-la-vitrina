/** CLI: `npm run datos:catalogo` → public/data/catalogo.json (lo que necesita la escena). */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Fuentes, Meteorito, RegionEscape, RegionesOrigen } from '../src/schema';
import { construirCatalogo } from './catalogo';

const leer = (ruta: string): unknown => JSON.parse(readFileSync(ruta, 'utf8'));
const catalogo = construirCatalogo({
  fuentes: Fuentes.parse(leer('data/fuentes.json')),
  meteoritos: readdirSync('data/pedigri')
    .filter((f) => f.endsWith('.json'))
    .map((f) => Meteorito.parse(leer(`data/pedigri/${f}`))),
  regiones: RegionesOrigen.parse(leer('data/regiones-origen.json')),
  escape: RegionEscape.array().parse(leer('data/regiones-escape.json')),
});

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/catalogo.json', JSON.stringify(catalogo));
console.log(
  `catalogo.json: ${catalogo.piezas.length} piezas, ${catalogo.zonas.length} zonas, ` +
    `${catalogo.resonancias.length} resonancias.`,
);
