/** CLI: `npm run schemas`. Exporta los esquemas zod a JSON Schema en docs/esquemas/. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { Fuentes, Meteorito, RegionOrigen } from '../src/schema';

const dir = 'docs/esquemas';
mkdirSync(dir, { recursive: true });
for (const [nombre, esquema] of Object.entries({
  fuentes: Fuentes,
  meteorito: Meteorito,
  'region-origen': RegionOrigen,
})) {
  writeFileSync(
    `${dir}/${nombre}.schema.json`,
    JSON.stringify(z.toJSONSchema(esquema), null, 2) + '\n',
  );
}
console.log(`Esquemas exportados a ${dir}/`);
