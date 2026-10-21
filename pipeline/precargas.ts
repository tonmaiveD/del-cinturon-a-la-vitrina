/**
 * Precargas en el HTML (M15): los datos iniciales y la textura de 1024 empiezan a descargarse
 * con la página, en vez de esperar a que el script de entrada se ejecute y los pida (medido: la
 * red quedaba a medias entre los 170 y los 520 ms). Los modos CORS coinciden con los de la
 * petición real (`fetch` en src/ui/recursos.ts y `crossOrigin = 'anonymous'` del TextureLoader
 * de Three), para que el navegador reutilice la descarga y no la repita.
 *
 * El módulo 3D no se precarga: se midió (2026-10-21) y no adelanta la escena más que esto.
 */
import type { Plugin } from 'vite';

/** Datos que la página pide nada más arrancar (src/main.ts). */
export const DATOS_INICIALES = [
  'data/catalogo.json',
  'data/chelyabinsk-orbitas.json',
  'data/chelyabinsk-trayectoria.json',
];
export const TEXTURA_INICIAL = 'texturas/tierra-1024.webp';

export function precargas(): Plugin {
  let base = '/';
  return {
    name: 'precargas',
    apply: 'build',
    configResolved(c) {
      base = c.base;
    },
    transformIndexHtml: () => [
      ...DATOS_INICIALES.map((d) => ({
        tag: 'link',
        attrs: { rel: 'preload', as: 'fetch', crossorigin: 'anonymous', href: `${base}${d}` },
        injectTo: 'head' as const,
      })),
      {
        tag: 'link',
        attrs: {
          rel: 'preload',
          as: 'image',
          crossorigin: 'anonymous',
          href: `${base}${TEXTURA_INICIAL}`,
        },
        injectTo: 'head' as const,
      },
    ],
  };
}
