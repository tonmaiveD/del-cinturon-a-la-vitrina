/** Selector de modo (pedigrí / CNEOS): botones con aria-pressed y secciones del panel. */
import type { Modo } from './estado-url';

export function montarModo(inicial: Modo) {
  const botones = [...document.querySelectorAll<HTMLButtonElement>('[data-modo]')];
  const secciones = {
    pedigri: document.querySelector<HTMLElement>('#seccion-pedigri')!,
    cneos: document.querySelector<HTMLElement>('#seccion-cneos')!,
  };
  const oyentes = new Set<(m: Modo) => void>();
  let actual = inicial;
  function pintar(): void {
    for (const b of botones) b.setAttribute('aria-pressed', String(b.dataset.modo === actual));
    secciones.pedigri.hidden = actual !== 'pedigri';
    secciones.cneos.hidden = actual !== 'cneos';
  }
  function fijar(m: Modo): void {
    if (m === actual) return;
    actual = m;
    pintar();
    oyentes.forEach((f) => f(m));
  }
  for (const b of botones) b.addEventListener('click', () => fijar(b.dataset.modo as Modo));
  pintar();
  return { actual: () => actual, fijar, alCambiar: (f: (m: Modo) => void) => oyentes.add(f) };
}
export type ControlModo = ReturnType<typeof montarModo>;
