/**
 * Nube de órbitas del bólido CNEOS seleccionado en la vista heliocéntrica (AU, eclíptica J2000).
 * Se dibujan todos los clones del Monte Carlo, también los hiperbólicos (rama con r ≤ 6 AU).
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Object3D,
} from 'three';
import type { ElementosCompactos } from '../cneos/resumen';
import { puntosConica } from '../core/muestreo';
import { aThree } from './coordenadas';

const PUNTOS = 160;

export function crearNubeCneos() {
  const grupo = new Group();
  grupo.name = 'nube-cneos';
  const nube = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: new Color(0x6fd3ff),
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  nube.frustumCulled = false;
  grupo.add(nube);
  /** Ancla de la etiqueta: afelio de la órbita nominal (o el perihelio si es hiperbólica). */
  const ancla = new Object3D();
  grupo.add(ancla);

  function fijar(clones: ElementosCompactos[], nominal: ElementosCompactos | undefined): void {
    nube.geometry.dispose();
    const segmentos: number[] = [];
    for (const [a, e, i, nodo, omega] of clones as number[][]) {
      const { puntos, cerrada } = puntosConica(
        { a: a!, e: e!, i: i!, nodo: nodo!, omega: omega! },
        PUNTOS,
      );
      const n = puntos.length;
      for (let k = 0; k < (cerrada ? n : n - 1); k++) {
        const p = aThree(puntos[k]!);
        const q = aThree(puntos[(k + 1) % n]!);
        segmentos.push(p.x, p.y, p.z, q.x, q.y, q.z);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(segmentos), 3));
    nube.geometry = g;
    grupo.visible = clones.length > 0;
    if (nominal) {
      const [a, e, i, nodo, omega] = nominal as number[];
      const f = { a: a!, e: e!, i: i!, nodo: nodo!, omega: omega! };
      // Elipse con 2 puntos: [perihelio, afelio]; hipérbola con 3: [−ν∞, perihelio, +ν∞]
      const { puntos } = puntosConica(f, e! < 1 ? 2 : 3);
      ancla.position.copy(aThree(puntos[1]!));
    }
  }

  return { grupo, fijar, ancla, vaciar: () => fijar([], undefined) };
}
export type NubeCneos = ReturnType<typeof crearNubeCneos>;
