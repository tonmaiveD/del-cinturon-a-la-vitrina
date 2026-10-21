/**
 * Plugin de Vite: inyecta en `index.html` las variables CSS del tema (src/tema.ts) antes de la
 * hoja de estilos, para que la primera pintura ya tenga los colores de la marca.
 */
import type { Plugin } from 'vite';
import { variablesCss } from '../src/tema.ts';

export function temaCss(): Plugin {
  return {
    name: 'tema-css',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace('</title>', `</title>\n    <style id="tema">${variablesCss()}</style>`),
    },
  };
}
