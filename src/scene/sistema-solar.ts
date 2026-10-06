/**
 * Vista heliocéntrica en el marco eclíptico J2000 (unidades: AU).
 * Planetas y sus órbitas desde astronomy-engine; órbita del meteoroide como nube de clones
 * Monte Carlo (nunca una sola línea) más la órbita nominal resaltada.
 */
import * as Astro from 'astronomy-engine';
import {
  AdditiveBlending,
  BufferAttribute,
  Points,
  PointsMaterial,
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
import { indiceInferior, interpolar, type Muestra } from '../timeline/interpolacion';
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
export const EXAGERACION = { sol: 10, planetas: 1500, jupiter: 150 };
/** Radio dibujado del meteoroide en escala visual (AU): ~900 000 km. */
export const RADIO_VISUAL_METEOROIDE_AU = 0.006;

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

export function crearVistaSistemaSolar(
  fecha: Date,
  orbitas: DatosOrbitas,
  trayectoria: Muestra[],
  radioMeteoroideKm = 0.01,
) {
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
    malla.userData.clave = p.clave;
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

  // Meteoroide sobre la trayectoria N-cuerpos nominal, con estela hasta el instante actual
  const ptsTray = trayectoria.map(([, x, y, z]) => aThree([x, y, z]));
  const geomEstela = new BufferGeometry().setFromPoints(ptsTray);
  const estela = new Line(geomEstela, new LineBasicMaterial({ color: 0xffd08a }));
  estela.frustumCulled = false;
  escena.add(estela);
  const meteoroide = new Mesh(
    new SphereGeometry(1, 16, 8),
    new MeshBasicMaterial({ color: new Color(6, 3.4, 1.2) }),
  );
  escena.add(meteoroide);

  // Nube de posiciones: cada clone propagado con Kepler (sin perturbaciones) al instante actual
  const elClones = orbitas.clones.map(aRad);
  const posClones = new Float32Array(elClones.length * 3);
  const geomPuntos = new BufferGeometry();
  geomPuntos.setAttribute('position', new BufferAttribute(posClones, 3));
  const puntosClones = new Points(
    geomPuntos,
    new PointsMaterial({
      color: 0xffb066,
      size: 3,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  puntosClones.frustumCulled = false;
  escena.add(puntosClones);
  const epocaUt = orbitas.nominal.epoca_ut_j2000;

  function actualizarTiempo(f: Date): void {
    const tt = Astro.MakeTime(f);
    for (const p of PLANETAS) mallas.get(p.clave)!.position.copy(aThree(helioEcl(p.cuerpo, tt)));
    const dt = tt.ut - epocaUt;
    geomEstela.setDrawRange(0, indiceInferior(trayectoria, dt) + 1);
    meteoroide.position.copy(aThree(interpolar(trayectoria, dt)));
    elClones.forEach((el, k) => {
      const r = estadoDesdeElementos(el, MU_SOL, tt.ut).r;
      const v = aThree(r);
      posClones.set([v.x, v.y, v.z], k * 3);
    });
    geomPuntos.attributes.position!.needsUpdate = true;
  }
  actualizarTiempo(fecha);

  const radioSolAU = RADIO_SOL_KM / KM_POR_AU;
  function aplicarEscala(visual: boolean): void {
    sol.scale.setScalar(radioSolAU * (visual ? EXAGERACION.sol : 1));
    for (const m of mallas.values())
      m.scale.setScalar(
        m.userData.radioAU *
          (visual
            ? m.userData.clave === 'jupiter'
              ? EXAGERACION.jupiter
              : EXAGERACION.planetas
            : 1),
      );
    // Meteoroide: en escala visual, del tamaño aparente de un planeta pequeño
    meteoroide.scale.setScalar(visual ? RADIO_VISUAL_METEOROIDE_AU : radioMeteoroideKm / KM_POR_AU);
  }
  aplicarEscala(true);

  /** Objetos propios del bólido de Chelyabinsk (nube CNEOS, nominal, trayectoria). */
  function mostrarBolido(si: boolean): void {
    for (const o of [nube, nominal, estela, meteoroide, puntosClones]) o.visible = si;
  }

  const posicionTierra = () => mallas.get('tierra')!.position.clone();
  return {
    escena,
    mostrarBolido,
    aplicarEscala,
    posicionTierra,
    mallas,
    meteoroide,
    sol,
    actualizarTiempo,
  };
}
