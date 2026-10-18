/**
 * Selección con el ratón o el dedo: un clic sin arrastre sobre un marcador del globo selecciona
 * su pieza o su bólido; un arrastre (girar el globo) se notifica aparte.
 */
import { Raycaster, Vector2, type Camera, type InstancedMesh } from 'three';

/** Marcadores seleccionables de la vista actual. */
export interface Seleccionables {
  malla: InstancedMesh;
  idDeInstancia(instancia: number): string | undefined;
}

export interface Puntero {
  camara(): Camera;
  /** Marcadores seleccionables ahora (undefined: ninguno, p. ej. en la vista solar). */
  seleccionables(): Seleccionables | undefined;
  alSeleccionar(id: string): void;
  alArrastrar(): void;
}

/** Desplazamiento (px) a partir del cual un gesto es un arrastre y no un clic. */
const UMBRAL_ARRASTRE = 5;

export function conectarPuntero(canvas: HTMLCanvasElement, p: Puntero): void {
  const rayo = new Raycaster();
  const ndc = new Vector2();
  const idBajo = (ev: PointerEvent): string | undefined => {
    const s = p.seleccionables();
    if (!s) return undefined;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, p.camara());
    const [hit] = rayo.intersectObject(s.malla);
    return hit?.instanceId !== undefined ? s.idDeInstancia(hit.instanceId) : undefined;
  };
  let inicio: { x: number; y: number } | undefined;
  canvas.addEventListener('pointerdown', (ev) => (inicio = { x: ev.clientX, y: ev.clientY }));
  canvas.addEventListener('pointerup', (ev) => {
    const ini = inicio;
    inicio = undefined;
    if (!ini) return;
    if (Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) > UMBRAL_ARRASTRE)
      return p.alArrastrar();
    const id = idBajo(ev);
    if (id) p.alSeleccionar(id);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.buttons) return;
    canvas.classList.toggle('apuntando', idBajo(ev) !== undefined);
  });
}
