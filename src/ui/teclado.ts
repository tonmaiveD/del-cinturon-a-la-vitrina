/**
 * Cámara sin arrastrar (M04: botones y teclado con el foco en la escena) y atajos de teclado
 * globales de la línea de tiempo.
 */
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const PASO_GIRO = Math.PI / 12;
const PASO_ZOOM = 1.25;

const TECLAS_CAMARA: Record<string, string> = {
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  '+': 'acercar',
  '=': 'acercar',
  '-': 'alejar',
  '0': 'restablecer',
};

export interface ControlCamara {
  /** Se llama antes de cada acción (p. ej. para cortar el recorrido). */
  antes(): void;
  /** Controles de la vista activa. */
  controles(): OrbitControls;
  restablecer(): void;
}

function mover(c: ControlCamara, accion: string): void {
  c.antes();
  const ctl = c.controles();
  if (accion === 'izquierda') ctl.rotateLeft(PASO_GIRO);
  else if (accion === 'derecha') ctl.rotateLeft(-PASO_GIRO);
  else if (accion === 'arriba') ctl.rotateUp(PASO_GIRO);
  else if (accion === 'abajo') ctl.rotateUp(-PASO_GIRO);
  // En OrbitControls, dollyOut acerca la cámara y dollyIn la aleja (comprobado en camara.spec.ts)
  else if (accion === 'acercar') ctl.dollyOut(PASO_ZOOM);
  else if (accion === 'alejar') ctl.dollyIn(PASO_ZOOM);
  else if (accion === 'restablecer') c.restablecer();
}

/** Botones `[data-camara]` y teclas sobre la escena (con el foco en el lienzo). */
export function conectarCamara(canvas: HTMLCanvasElement, c: ControlCamara): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-camara]'))
    b.addEventListener('click', () => mover(c, b.dataset.camara!));
  canvas.addEventListener('keydown', (ev) => {
    const accion = TECLAS_CAMARA[ev.key];
    if (!accion || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    ev.stopPropagation(); // las flechas no mueven el reloj cuando el foco está en la escena
    mover(c, accion);
  });
}

export interface Atajos {
  escape(): void;
  reproducir(): void;
  /** Un día atrás (-1) o adelante (+1). */
  moverDia(signo: -1 | 1): void;
  irAlFinal(): void;
}

/** Espacio, flechas izquierda y derecha, Escape e I (ver «atajos.texto» en es.json). */
export function conectarAtajos(a: Atajos): void {
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    // Con un diálogo abierto, el teclado no altera la escena de fondo
    if (document.querySelector('dialog[open]')) return;
    const objetivo = ev.target as HTMLElement;
    // Solo se ceden las teclas que el propio control usa
    const enCampo = objetivo.closest('input, select, textarea') !== null;
    const enActivable = objetivo.closest('button, summary, a') !== null;
    if (ev.key === 'Escape') a.escape();
    else if (ev.key === ' ') {
      if (enCampo || enActivable) return;
      ev.preventDefault();
      a.reproducir();
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      if (enCampo) return;
      a.moverDia(ev.key === 'ArrowLeft' ? -1 : 1);
    } else if (ev.key.toLowerCase() === 'i' && !enCampo && !enActivable) {
      // Atajo de una letra (WCAG 2.1.4): solo sin foco en un control, nunca desde un botón o campo
      a.irAlFinal();
    }
  });
}
