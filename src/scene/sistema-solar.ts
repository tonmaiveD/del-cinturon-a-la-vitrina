/**
 * Vista heliocéntrica en el marco eclíptico J2000 (unidades: AU).
 * Planetas y sus órbitas desde astronomy-engine; órbita del meteoroide como nube de clones
 * Monte Carlo (nunca una sola línea) más la órbita nominal resaltada.
 */
import * as Astro from 'astronomy-engine';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  AmbientLight,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
} from 'three';
import { gm } from '../core/dinamica';
import { estadoDesdeElementos, type Elementos } from '../core/kepler';
import { eqjAEcl, KM_POR_AU } from '../core/marcos';
import { GRAD, type Vec3 } from '../core/vector';
import { aThree } from './coordenadas';
import { PLANETAS, RADIO_SOL_KM, type Planeta } from './cuerpos';

export interface ElementosGrados {
  a: number;
  e: number;
  i: number;
  nodo: number;
  omega: number;
  M: number;
  epoca_ut_j2000: number;
}

export interface DatosOrbitas {
  nominal: ElementosGrados;
  clones: ElementosGrados[];
}

/** Factores de exageración de la escala visual (se muestran en la etiqueta). */
export const EXAGERACION = { sol: 10, planetas: 1500 };

const MU_SOL = gm('Sun');
const PUNTOS_ORBITA = 160;

const aRad = (g: ElementosGrados): Elementos => ({
  a: g.a,
  e: g.e,
  i: g.i * GRAD,
  nodo: g.nodo * GRAD,
  omega: g.omega * GRAD,
  M: g.M * GRAD,
  epoca: g.epoca_ut_j2000,
});

/** Puntos de una órbita elíptica completa (marco eclíptico, AU). */
function puntosOrbita(el: Elementos): Vec3[] {
  const n = Math.sqrt(MU_SOL / el.a ** 3);
  const periodo = (2 * Math.PI) / n;
  return Array.from(
    { length: PUNTOS_ORBITA },
    (_, k) => estadoDesdeElementos(el, MU_SOL, el.epoca + (k / PUNTOS_ORBITA) * periodo).r,
  );
}

function helioEcl(cuerpo: Planeta['cuerpo'], t: Astro.AstroTime): Vec3 {
  const v = Astro.HelioVector(cuerpo as Astro.Body, t);
  return eqjAEcl([v.x, v.y, v.z]);
}

export function crearVistaSistemaSolar(fecha: Date, orbitas: DatosOrbitas) {
  const escena = new Scene();
  escena.background = new Color(0x000000);
  const t = Astro.MakeTime(fecha);

  const sol = new Mesh(
    new SphereGeometry(1, 48, 24),
    new MeshBasicMaterial({ color: new Color(6, 4.6, 2.6) }),
  );
  escena.add(sol, new PointLight(0xffffff, 2, 0, 0), new AmbientLight(0xffffff, 0.15));

  const planetas = new Group();
  const mallas = new Map<Planeta['clave'], Mesh>();
  for (const p of PLANETAS) {
    const pos = aThree(helioEcl(p.cuerpo, t));
    const malla = new Mesh(
      new SphereGeometry(1, 24, 12),
      new MeshStandardMaterial({ color: p.color, roughness: 1 }),
    );
    malla.position.copy(pos);
    malla.userData.radioAU = p.radioKm / KM_POR_AU;
    mallas.set(p.clave, malla);
    planetas.add(malla);

    const pts = Array.from({ length: 256 }, (_, k) =>
      aThree(helioEcl(p.cuerpo, t.AddDays((k / 256) * p.periodoMuestreo))),
    );
    pts.push(pts[0]!.clone());
    planetas.add(
      new Line(
        new BufferGeometry().setFromPoints(pts),
        new LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.35 }),
      ),
    );
  }
  escena.add(planetas);

  // Nube de órbitas: todos los clones en una sola geometría de segmentos
  const n = orbitas.clones.length;
  const posiciones = new Float32Array(n * PUNTOS_ORBITA * 2 * 3);
  let o = 0;
  for (const c of orbitas.clones) {
    const pts = puntosOrbita(aRad(c)).map((v) => aThree(v));
    for (let k = 0; k < PUNTOS_ORBITA; k++) {
      const a = pts[k]!;
      const b = pts[(k + 1) % PUNTOS_ORBITA]!;
      posiciones.set([a.x, a.y, a.z, b.x, b.y, b.z], o);
      o += 6;
    }
  }
  const geomNube = new BufferGeometry();
  geomNube.setAttribute('position', new BufferAttribute(posiciones, 3));
  const nube = new LineSegments(
    geomNube,
    new LineBasicMaterial({
      color: 0xff9a3c,
      transparent: true,
      opacity: Math.min(0.5, 12 / n),
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  escena.add(nube);

  const ptsNominal = puntosOrbita(aRad(orbitas.nominal)).map((v) => aThree(v));
  ptsNominal.push(ptsNominal[0]!.clone());
  const nominal = new Line(
    new BufferGeometry().setFromPoints(ptsNominal),
    new LineBasicMaterial({ color: 0xffe2b8, transparent: true, opacity: 0.9 }),
  );
  escena.add(nominal);

  const radioSolAU = RADIO_SOL_KM / KM_POR_AU;
  function aplicarEscala(visual: boolean): void {
    sol.scale.setScalar(radioSolAU * (visual ? EXAGERACION.sol : 1));
    for (const m of mallas.values())
      m.scale.setScalar(m.userData.radioAU * (visual ? EXAGERACION.planetas : 1));
  }
  aplicarEscala(true);

  const posicionTierra = () => mallas.get('tierra')!.position.clone();
  return { escena, aplicarEscala, posicionTierra, mallas };
}
