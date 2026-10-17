/**
 * Fotos de los ejemplares (M32): de los originales privados (con EXIF, GPS, modelo de cámara…)
 * a copias públicas sin ningún metadato. Solo se publican las de ejemplares aprobados en
 * español, para que un borrador no viaje en el build (como las fichas, M01).
 * Uso: `npm run datos:fotos`.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { Ejemplar } from '../src/schema/coleccion';
import { leerColeccion, RUTAS_COLECCION } from './coleccion';

/** Lado mayor de la copia pública, en píxeles (suficiente para una ficha; no se amplía). */
const LADO_MAXIMO = 2000;

/** Nombre público de la foto n (desde 1) de un ejemplar: no revela el nombre del original. */
export const nombrePublico = (sku: string, n: number) => `${sku}-${n}.webp`;

/**
 * Copia limpia: aplica la orientación EXIF a los píxeles y vuelve a codificar sin metadatos
 * (sharp no copia EXIF, XMP, IPTC ni ICC salvo que se le pida; la imagen queda en sRGB).
 */
export async function limpiarFoto(origen: string, destino: string): Promise<void> {
  await sharp(origen)
    .rotate()
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(destino);
}

/** Metadatos que delatarían al original (vacío si la imagen está limpia). */
export async function metadatosSensibles(ruta: string): Promise<string[]> {
  const m = await sharp(ruta).metadata();
  return (['exif', 'xmp', 'iptc', 'icc'] as const).filter((k) => m[k] !== undefined);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ejemplares = z.array(Ejemplar).parse(leerColeccion().ejemplares ?? []);
  const destino = RUTAS_COLECCION.fotosPublicas;
  // Se regeneran todas: una foto de un ejemplar que volvió a borrador no debe quedar publicada
  if (existsSync(destino)) rmSync(destino, { recursive: true });
  let n = 0;
  for (const e of ejemplares.filter((x) => x.revision.es.estado === 'aprobada')) {
    for (const [i, f] of e.fotos.entries()) {
      const origen = join(RUTAS_COLECCION.fotosOriginales, f.archivo);
      if (!existsSync(origen)) throw new Error(`${e.sku}: falta el original ${origen}`);
      mkdirSync(destino, { recursive: true });
      const salida = join(destino, nombrePublico(e.sku, i + 1));
      await limpiarFoto(origen, salida);
      const quedan = await metadatosSensibles(salida);
      if (quedan.length) throw new Error(`${salida}: conserva metadatos (${quedan.join(', ')})`);
      n++;
    }
  }
  const total = existsSync(destino) ? readdirSync(destino).length : 0;
  console.log(`${n} fotos limpias en ${destino}/ (${total} archivos).`);
}
