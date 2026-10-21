/**
 * Política de seguridad de contenido (M31) en una etiqueta <meta>, porque GitHub Pages no
 * permite cabeceras propias. Solo en el build: el servidor de desarrollo de Vite necesita
 * scripts en línea para recargar los cambios.
 *
 * Todo sale del propio sitio. El único contenido en línea admitido es el <style id="tema">
 * (pipeline/tema-css.ts), autorizado por su huella SHA-256; si apareciera otro script o estilo
 * en línea, el build falla en vez de publicar una política que lo bloquearía.
 *
 * Una <meta> no admite `frame-ancestors` (quién puede incrustar la web en un iframe): eso
 * necesita una cabecera, es decir, otro hosting (M10, si la tienda la incrusta).
 */
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

export function politica(hashesEstilo: string[]): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    `style-src 'self' ${hashesEstilo.map((h) => `'sha256-${h}'`).join(' ')}`.trim(),
    // data: y blob: para las texturas que Three.js genera en memoria
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Huellas de los <style> en línea y error si hay scripts en línea. */
export function contenidoEnLinea(html: string): { hashes: string[]; errores: string[] } {
  const errores: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))
    if (!/\bsrc=/.test(m[1]!) && m[2]!.trim())
      errores.push(`script en línea: ${m[2]!.trim().slice(0, 60)}`);
  if (/\sstyle="/.test(html)) errores.push('atributo style en el HTML');
  const hashes: string[] = [];
  for (const m of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)) {
    if (!/id="tema"/.test(m[1]!)) errores.push(`estilo en línea inesperado: <style${m[1]}>`);
    hashes.push(createHash('sha256').update(m[2]!).digest('base64'));
  }
  return { hashes, errores };
}

export function csp(): Plugin {
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const { hashes, errores } = contenidoEnLinea(html);
        if (errores.length) throw new Error(`CSP: ${errores.join('; ')}`);
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: politica(hashes) },
            injectTo: 'head-prepend',
          },
          {
            tag: 'meta',
            attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}
