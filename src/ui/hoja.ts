/**
 * Hoja de paneles para pantallas pequeñas (M02): en móvil los dos paneles van en una sola hoja
 * inferior (o lateral en horizontal) con accesos a «Datos» y «Controles», y botones para
 * ampliarla u ocultarla. En escritorio la hoja no existe visualmente (display: contents).
 */
import { t } from '../i18n';
import type { AreaLibre } from '../scene/escena';

export type EstadoHoja = 'normal' | 'ampliada' | 'oculta';

export function montarHoja() {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const hoja = $('#hoja');
  const contenido = $('#hoja-contenido');
  const bAmpliar = $<HTMLButtonElement>('#hoja-ampliar');
  const bOcultar = $<HTMLButtonElement>('#hoja-ocultar');
  const destinos = {
    datos: $('.panel-pieza'),
    controles: $('#panel-controles'),
  };

  function fijar(estado: EstadoHoja): void {
    hoja.dataset.estado = estado;
    bAmpliar.setAttribute('aria-pressed', String(estado === 'ampliada'));
    bOcultar.setAttribute('aria-expanded', String(estado !== 'oculta'));
    bOcultar.textContent = t(estado === 'oculta' ? 'hoja.mostrar' : 'hoja.ocultar');
  }
  const estado = () => (hoja.dataset.estado ?? 'normal') as EstadoHoja;

  function ir(destino: keyof typeof destinos): void {
    if (estado() === 'oculta') fijar('normal');
    const objetivo = destinos[destino];
    contenido.scrollTo({ top: objetivo.offsetTop - contenido.offsetTop, behavior: 'auto' });
  }

  $<HTMLButtonElement>('#hoja-datos').addEventListener('click', () => ir('datos'));
  $<HTMLButtonElement>('#hoja-controles').addEventListener('click', () => ir('controles'));
  bAmpliar.addEventListener('click', () => fijar(estado() === 'ampliada' ? 'normal' : 'ampliada'));
  bOcultar.addEventListener('click', () => fijar(estado() === 'oculta' ? 'normal' : 'oculta'));
  fijar('normal');
  return { fijar, estado };
}

/** ¿Está la hoja en modo móvil (fija sobre la escena)? */
const hojaActiva = (hoja: HTMLElement) => getComputedStyle(hoja).position === 'fixed';

/**
 * Rectángulo de la escena que no tapan la cabecera ni la hoja (px de la ventana), o null si
 * los paneles flotan a los lados (escritorio): la cámara se centra en esa zona libre.
 */
export function areaLibre(): AreaLibre | null {
  const hoja = document.querySelector<HTMLElement>('#hoja');
  if (!hoja || !hojaActiva(hoja)) return null;
  const r = hoja.getBoundingClientRect();
  const cab = document.querySelector('.cabecera')?.getBoundingClientRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Hoja lateral (horizontal): ocupa la derecha
  if (r.left > 0 && r.top <= 1) return { arriba: 0, abajo: h, izquierda: 0, derecha: r.left };
  return { arriba: cab?.bottom ?? 0, abajo: Math.min(h, r.top), izquierda: 0, derecha: w };
}
