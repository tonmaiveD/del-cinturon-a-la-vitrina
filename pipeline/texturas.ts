/**
 * CLI: `npm run datos:texturas`.
 * Genera las texturas WebP de la Tierra desde el original de NASA Blue Marble NG
 * (world.topo.bathy.200412.3x5400x2700.jpg, fuente "nasa-blue-marble"), que se descarga a
 * .trabajo/ si no está. Tamaños: 1024 (carga inicial), 2048 (móvil), 4096 (escritorio).
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const URL_ORIGEN =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg';
const ORIGEN = '.trabajo/world.topo.bathy.200412.3x5400x2700.jpg';

if (!existsSync(ORIGEN)) {
  mkdirSync('.trabajo', { recursive: true });
  const r = await fetch(URL_ORIGEN);
  if (!r.ok) throw new Error(`descarga fallida: ${r.status}`);
  writeFileSync(ORIGEN, Buffer.from(await r.arrayBuffer()));
}
mkdirSync('public/texturas', { recursive: true });
for (const [ancho, calidad] of [
  [1024, 70],
  [2048, 75],
  [4096, 80],
] as const) {
  const salida = `public/texturas/tierra-${ancho}.webp`;
  await sharp(ORIGEN)
    .resize(ancho, ancho / 2)
    .webp({ quality: calidad })
    .toFile(salida);
  console.log(`${salida}: ${(statSync(salida).size / 1024).toFixed(0)} kB`);
}
