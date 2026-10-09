/**
 * Bólidos del CNEOS sobre el globo (una InstancedMesh, hija del globo: ECEF). Cada símbolo está
 * en el punto del pico de brillo publicado; el tamaño crece con el logaritmo de la energía de
 * impacto y el color indica la calidad (leyenda en el panel). Son símbolos, no objetos a escala.
 */
import * as Astro from 'astronomy-engine';
import {
  BufferGeometry,
  Color,
  type Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import type { EventoCneos } from '../cneos/eventos';
import { COLOR_LEYENDA, grupoLeyenda, type ConCalidad } from '../cneos/formato';
import { eqjAEcef, estadoPuntoTerrestre, KM_POR_AU } from '../core/marcos';
import type { Vec3 } from '../core/vector';
import { RADIO_TIERRA_KM } from './cuerpos';
import { localGlobo, trayectoriaEntradaEcefKm } from './trayectoria-entrada';

/** Radio del símbolo (radios terrestres) según la energía de impacto: 12 km a 0,01 kt, ~60 km a 100 kt. */
export const radioSimbolo = (kt: number) =>
  (12 + 12 * Math.max(0, Math.log10(Math.max(kt, 0.01) / 0.01))) / RADIO_TIERRA_KM;
/** Altura del símbolo si el evento no publica altura (km): por encima del achatamiento. */
const ALTURA_SIN_DATO_KM = 20;

export function crearBolidosTierra(globo: Group, eventos: (EventoCneos & ConCalidad)[]) {
  const situables = eventos.filter((e) => e.lat !== undefined && e.lon !== undefined);
  const t0 = Astro.MakeTime(new Date('2000-01-01T12:00:00Z'));
  const posiciones = situables.map((e) => {
    const alt = e.alt_km ?? ALTURA_SIN_DATO_KM;
    const r = estadoPuntoTerrestre(e.lat!, e.lon!, alt * 1000, t0).r;
    return localGlobo(eqjAEcef(r, t0).map((c) => c * KM_POR_AU) as Vec3);
  });

  const malla = new InstancedMesh(
    new SphereGeometry(1, 10, 5),
    new MeshBasicMaterial({ color: 0xffffff }),
    situables.length,
  );
  malla.name = 'bolidos-cneos';
  const color = new Color();
  situables.forEach((e, k) => {
    // Valores > 1 para que el bloom los realce un poco
    color.set(COLOR_LEYENDA[grupoLeyenda(e)]).multiplyScalar(1.3);
    malla.setColorAt(k, color);
  });
  globo.add(malla);

  const resalte = new Mesh(
    new SphereGeometry(1, 16, 8),
    new MeshBasicMaterial({ color: new Color(3.2, 2.8, 2.2) }),
  );
  resalte.visible = false;
  globo.add(resalte);

  const trayectoria = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xffe3b0 }));
  trayectoria.visible = false;
  trayectoria.frustumCulled = false;
  globo.add(trayectoria);

  const ficticio = new Object3D();
  const visibles = new Set(situables.map((e) => e.id));
  function actualizarInstancias(): void {
    situables.forEach((e, k) => {
      ficticio.position.copy(posiciones[k]!);
      ficticio.scale.setScalar(visibles.has(e.id) ? radioSimbolo(e.impacto_kt) : 0);
      ficticio.updateMatrix();
      malla.setMatrixAt(k, ficticio.matrix);
    });
    malla.instanceMatrix.needsUpdate = true;
    malla.computeBoundingSphere();
  }
  actualizarInstancias();

  const indice = (id: string) => situables.findIndex((e) => e.id === id);
  return {
    malla,
    resalte,
    mostrar(si: boolean): void {
      malla.visible = si;
      if (!si) resalte.visible = trayectoria.visible = false;
    },
    filtrar(ids: Iterable<string>): void {
      visibles.clear();
      for (const id of ids) visibles.add(id);
      actualizarInstancias();
    },
    seleccionar(id: string | undefined): void {
      const k = id ? indice(id) : -1;
      resalte.visible = k >= 0;
      trayectoria.visible = false;
      if (k < 0) return;
      const e = situables[k]!;
      resalte.position.copy(posiciones[k]!);
      resalte.scale.setScalar(radioSimbolo(e.impacto_kt) * 1.6);
      // Trayectoria de entrada solo con vector de velocidad y altura publicados
      if (e.v_ecef_kms && e.alt_km !== undefined) {
        const { inicio, pico } = trayectoriaEntradaEcefKm(e.lat!, e.lon!, e.alt_km, e.v_ecef_kms);
        trayectoria.geometry.dispose();
        trayectoria.geometry = new BufferGeometry().setFromPoints([
          localGlobo(inicio),
          localGlobo(pico),
        ]);
        trayectoria.visible = true;
      }
    },
    eventoDeInstancia(k: number): string | undefined {
      const e = situables[k];
      return e && visibles.has(e.id) ? e.id : undefined;
    },
    posicionMundo(id: string): Vector3 | undefined {
      const k = indice(id);
      if (k < 0) return undefined;
      globo.updateMatrixWorld();
      return posiciones[k]!.clone().applyMatrix4(new Matrix4().copy(globo.matrixWorld));
    },
  };
}
export type BolidosTierra = ReturnType<typeof crearBolidosTierra>;
