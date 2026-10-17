/** CLI: `npm run schemas`. Exporta los esquemas zod a JSON Schema en docs/esquemas/. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { Fuentes, Meteorito, RegionOrigen } from '../src/schema';
import { Ejemplar, EjemplarPrivado, MeteoritoColeccion } from '../src/schema/coleccion';

const dir = 'docs/esquemas';
mkdirSync(dir, { recursive: true });
for (const [nombre, esquema] of Object.entries({
  fuentes: Fuentes,
  meteorito: Meteorito,
  'region-origen': RegionOrigen,
  'coleccion-ejemplares': z.array(Ejemplar),
  'coleccion-meteoritos': z.array(MeteoritoColeccion),
  'coleccion-privado-ejemplares': z.array(EjemplarPrivado),
})) {
  writeFileSync(
    `${dir}/${nombre}.schema.json`,
    JSON.stringify(z.toJSONSchema(esquema), null, 2) + '\n',
  );
}
console.log(`Esquemas exportados a ${dir}/`);
