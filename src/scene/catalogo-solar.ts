/**
 * Capa de catálogo en la vista heliocéntrica (AU, eclíptica J2000):
 * - una nube de órbitas por pieza, muestreada con la σ publicada de su órbita principal
 *   (nunca una sola línea), con dos niveles de detalle según la distancia de la cámara;
 * - la pieza seleccionada, con una nube más densa y destacada;
 * - regiones de escape con geometría publicada (Hungaria, Phocaea) como volúmenes aproximados
 *   y anillos en el centro nominal de las resonancias 3:1, 5:2 y 2:1.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  LOD,
  Object3D,
  Vector3,
} from 'three';
import { muestrearOrbita, puntosForma, semillaDe, type FormaOrbita } from '../core/muestreo';
import type { Catalogo, PiezaCatalogo } from '../ui/catalogo';
import { aThree } from './coordenadas';

/** Niveles de detalle: [clones, puntos por órbita]. */
const DETALLE = { cerca: [24, 128], lejos: [8, 48], seleccion: [160, 160] } as const;
/** Distancia de la cámara al Sol (AU) a partir de la cual se usa el nivel «lejos». */
export const DISTANCIA_LOD = 6;

const COLOR_NUBE = new Color(0x8f9bd6);
const COLOR_SELECCION = new Color(0x6fd3ff);

function geometriaNube(formas: FormaOrbita[], n: number): BufferGeometry {
  const pos = new Float32Array(formas.length * n * 6);
  let o = 0;
  for (const f of formas) {
    const pts = puntosForma(f, n).map((p) => aThree(p));
    for (let k = 0; k < n; k++) {
      const a = pts[k]!;
      const b = pts[(k + 1) % n]!;
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], o);
      o += 6;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  return g;
}

// Mezcla normal (no aditiva): con cientos de líneas superpuestas la aditiva supera 1 en el búfer
// HDR y el bloom lo convierte en neblina
const materialNube = (color: Color, opacidad: number) =>
  new LineBasicMaterial({ color, transparent: true, opacity: opacidad, depthWrite: false });

export function crearCatalogoSolar(catalogo: Catalogo) {
  const grupo = new Group();
  grupo.name = 'catalogo';

  // ---------- Nubes de todas las piezas (LOD por distancia) ----------
  const nubes = new Map<string, LOD>();
  const matCerca = materialNube(COLOR_NUBE, 0.07);
  const matLejos = materialNube(COLOR_NUBE, 0.14);
  const formasDe = (p: PiezaCatalogo, n: number) => muestrearOrbita(p.orbita!, n, semillaDe(p.id));
  for (const p of catalogo.piezas) {
    if (!p.orbita) continue;
    const lod = new LOD();
    lod.addLevel(
      new LineSegments(geometriaNube(formasDe(p, DETALLE.cerca[0]), DETALLE.cerca[1]), matCerca),
      0,
    );
    lod.addLevel(
      new LineSegments(geometriaNube(formasDe(p, DETALLE.lejos[0]), DETALLE.lejos[1]), matLejos),
      DISTANCIA_LOD,
    );
    lod.name = `nube-${p.id}`;
    nubes.set(p.id, lod);
    grupo.add(lod);
  }

  // Nube de la pieza seleccionada: se construye al seleccionar
  const seleccion = new LineSegments(new BufferGeometry(), materialNube(COLOR_SELECCION, 0.12));
  seleccion.frustumCulled = false;
  seleccion.visible = false;
  grupo.add(seleccion);
  /** Ancla de la etiqueta de la seleccion (afelio de la órbita nominal publicada). */
  const anclaSeleccion = new Object3D();
  grupo.add(anclaSeleccion);
  let nClonesSeleccion = 0;

  // ---------- Regiones de escape ----------
  const regiones = new Group();
  regiones.name = 'regiones-escape';
  const anclas: { texto: string; objeto: Object3D }[] = [];
  const colorZona = { hungaria: 0x9be7a8, phocaea: 0xf0b6ff } as Record<string, number>;
  for (const z of catalogo.zonas) {
    const tanI = Math.tan(((z.i_max ?? 0) * Math.PI) / 180);
    // Contorno del volumen aproximado: a ∈ [a_min, a_max] y |latitud eclíptica| ≤ i_max.
    // Solo aristas (un relleno translúcido se acumula en neblina con el bloom).
    const color = colorZona[z.id] ?? 0xffffff;
    const contorno = new Group();
    contorno.name = `zona-${z.id}`;
    for (const a of [z.a_min, z.a_max])
      for (const signo of [-1, 1]) contorno.add(anillo(a, color, 0.4, false, signo * a * tanI));
    // Aristas verticales en 8 acimuts
    const aristas: Vector3[] = [];
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4;
      for (const a of [z.a_min, z.a_max]) {
        const [x, y] = [a * Math.cos(ang), a * Math.sin(ang)];
        aristas.push(new Vector3(x, -a * tanI, y), new Vector3(x, a * tanI, y));
      }
    }
    contorno.add(
      new LineSegments(
        new BufferGeometry().setFromPoints(aristas),
        new LineBasicMaterial({ color, transparent: true, opacity: 0.25 }),
      ),
    );
    regiones.add(contorno);
    const ancla = new Object3D();
    ancla.position.set(0, z.a_max * tanI, -(z.a_min + z.a_max) / 2);
    regiones.add(ancla);
    anclas.push({ texto: z.id, objeto: ancla });
  }
  for (const r of catalogo.resonancias) {
    regiones.add(anillo(r.a, 0xffd36b, 0.55, true));
    const ancla = new Object3D();
    ancla.position.set(r.a * Math.SQRT1_2, 0, r.a * Math.SQRT1_2);
    regiones.add(ancla);
    anclas.push({ texto: r.id, objeto: ancla });
  }
  grupo.add(regiones);

  function anillo(
    radio: number,
    color: number,
    opacidad: number,
    discontinuo: boolean,
    altura = 0,
  ): Line {
    const pts = Array.from({ length: 257 }, (_, k) => {
      const ang = (2 * Math.PI * k) / 256;
      return new Vector3(radio * Math.cos(ang), altura, radio * Math.sin(ang));
    });
    const linea = new Line(
      new BufferGeometry().setFromPoints(pts),
      discontinuo
        ? new LineDashedMaterial({
            color,
            transparent: true,
            opacity: opacidad,
            dashSize: 0.05,
            gapSize: 0.04,
          })
        : new LineBasicMaterial({ color, transparent: true, opacity: opacidad }),
    );
    if (discontinuo) linea.computeLineDistances();
    return linea;
  }

  return {
    grupo,
    regiones,
    anclas,
    anclaSeleccion,
    nubes,
    nClonesSeleccion: () => nClonesSeleccion,
    /** Muestra solo las nubes de las piezas indicadas (filtros). */
    filtrar(ids: Set<string>): void {
      for (const [id, lod] of nubes) lod.visible = ids.has(id);
    },
    seleccionar(p: PiezaCatalogo | undefined): void {
      seleccion.geometry.dispose();
      if (!p?.orbita) {
        seleccion.visible = false;
        nClonesSeleccion = 0;
        return;
      }
      const formas = formasDe(p, DETALLE.seleccion[0]);
      nClonesSeleccion = formas.length;
      seleccion.geometry = geometriaNube(formas, DETALLE.seleccion[1]);
      seleccion.visible = true;
      const o = p.orbita;
      const afelio = puntosForma(
        { a: o.a.v, e: o.e.v, i: o.i.v, nodo: o.nodo.v, omega: o.omega.v },
        2,
      )[1]!;
      anclaSeleccion.position.copy(aThree(afelio));
    },
  };
}
