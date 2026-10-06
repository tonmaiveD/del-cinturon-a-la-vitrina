/**
 * Marcadores de las caídas con pedigrí sobre el globo (una sola InstancedMesh, hija del globo:
 * ECEF). Cada marcador es la posición de referencia de la trayectoria luminosa publicada, no el
 * punto de caída. Son símbolos de tamaño fijo, no objetos a escala.
 */
import * as Astro from 'astronomy-engine';
import {
  Color,
  type Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { eqjAEcef, estadoPuntoTerrestre, KM_POR_AU } from '../core/marcos';
import type { Vec3 } from '../core/vector';
import type { PiezaCatalogo } from '../ui/catalogo';
import { RADIO_TIERRA_KM } from './cuerpos';

/** Radio del símbolo (radios terrestres): ~40 km. */
const RADIO_SIMBOLO = 40 / RADIO_TIERRA_KM;
/**
 * Altura del símbolo (km). El globo dibujado es una esfera de radio ecuatorial: por el
 * achatamiento (hasta 21 km en los polos) un punto a altura 0 quedaría bajo la superficie.
 */
const ALTURA_KM = 20;

export function crearMarcadoresTierra(globo: Group, piezas: PiezaCatalogo[]) {
  const conPunto = piezas.filter((p) => p.punto);
  const t0 = Astro.MakeTime(new Date('2000-01-01T12:00:00Z'));
  const posiciones = conPunto.map((p) => {
    const r = estadoPuntoTerrestre(p.punto!.lat, p.punto!.lon, ALTURA_KM * 1000, t0).r;
    const [x, y, z] = eqjAEcef(r, t0).map((c) => (c * KM_POR_AU) / RADIO_TIERRA_KM) as Vec3;
    return new Vector3(x, z, -y); // ECEF → ejes locales del globo
  });

  const malla = new InstancedMesh(
    new SphereGeometry(RADIO_SIMBOLO, 12, 6),
    new MeshBasicMaterial({ color: new Color(1.6, 1.1, 0.55) }),
    conPunto.length,
  );
  malla.name = 'marcadores-caidas';
  globo.add(malla);

  // Resalte de la pieza seleccionada (más grande y con brillo para el bloom)
  const resalte = new Mesh(
    new SphereGeometry(RADIO_SIMBOLO * 1.8, 16, 8),
    new MeshBasicMaterial({ color: new Color(3.2, 2.6, 1.4) }),
  );
  resalte.visible = false;
  globo.add(resalte);

  const ficticio = new Object3D();
  const visibles = new Set(conPunto.map((p) => p.id));
  function actualizarInstancias(): void {
    conPunto.forEach((p, k) => {
      ficticio.position.copy(posiciones[k]!);
      ficticio.scale.setScalar(visibles.has(p.id) ? 1 : 0);
      ficticio.updateMatrix();
      malla.setMatrixAt(k, ficticio.matrix);
    });
    malla.instanceMatrix.needsUpdate = true;
    malla.computeBoundingSphere();
  }
  actualizarInstancias();

  return {
    malla,
    resalte,
    /** Ids de las piezas que se muestran (filtros). */
    filtrar(ids: Iterable<string>): void {
      visibles.clear();
      for (const id of ids) visibles.add(id);
      actualizarInstancias();
    },
    seleccionar(id: string | undefined): void {
      const k = conPunto.findIndex((p) => p.id === id);
      resalte.visible = k >= 0;
      if (k >= 0) resalte.position.copy(posiciones[k]!);
    },
    /** Pieza correspondiente a una instancia (resultado de un raycast). */
    piezaDeInstancia(k: number): string | undefined {
      const p = conPunto[k];
      return p && visibles.has(p.id) ? p.id : undefined;
    },
    tienePunto: (id: string) => conPunto.some((p) => p.id === id),
    /** Posición en el mundo (radios terrestres, EQJ) del marcador en la orientación actual. */
    posicionMundo(id: string): Vector3 | undefined {
      const k = conPunto.findIndex((p) => p.id === id);
      if (k < 0) return undefined;
      globo.updateMatrixWorld();
      return posiciones[k]!.clone().applyMatrix4(new Matrix4().copy(globo.matrixWorld));
    },
  };
}
