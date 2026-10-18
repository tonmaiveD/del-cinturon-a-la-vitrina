/**
 * Cálculo de la órbita nominal y la nube Monte Carlo de un evento del CNEOS.
 *
 * La huella del método (M18, `pipeline/cneos-metodo.ts`) se calcula sobre este archivo y todo lo
 * que ejecuta: cualquier cambio aquí, en `registroDe()` o en el núcleo orbital que usa recalcula
 * las órbitas guardadas. Lo que no cambia el resultado (lectura de archivos, caché, resumen,
 * la propia huella) vive fuera, para que retocarlo no obligue a recalcular las 260 órbitas. Por
 * eso este archivo no importa `huella-metodo.ts`.
 */
import { createHash } from 'node:crypto';
import { crearAzar } from '../src/core/azar';
import type { Elementos } from '../src/core/kepler';
import {
  orbitaDeRadiante,
  radiantePerturbado,
  type IncertidumbreVelocidad,
} from '../src/core/montecarlo';
import { semillaDe } from '../src/core/muestreo';
import { orbitaDesdeBolido, type ResultadoOrbita } from '../src/core/orbita-bolido';
import { registroDe, type EventoCneos } from '../src/cneos/eventos';
import type { OrbitaCneos } from '../src/cneos/resumen';

export const N_CLONES = 200;
const GRADOS = 180 / Math.PI;
/** Entrada de la huella del método: este archivo y lo que ejecuta. */
export const ARCHIVO_CALCULO = 'pipeline/cneos-calculo.ts';

export const r6 = (x: number) => Number(x.toPrecision(6));
const aGrados = (el: Elementos) => [
  r6(el.a),
  r6(el.e),
  r6(el.i * GRADOS),
  r6(el.nodo * GRADOS),
  r6(el.omega * GRADOS),
  r6(el.M * GRADOS),
];

export interface MetodoCneos {
  /** Huella del método (`pipeline/cneos-metodo.ts`): código del cálculo, efemérides, parámetros. */
  huella: string;
  inc: IncertidumbreVelocidad;
  fuenteSigma: string;
}

/** Huella de un evento: sus datos leídos y el método. Si cambia, su órbita se recalcula. */
export function huellaEvento(ev: EventoCneos, metodo: MetodoCneos): string {
  return createHash('sha256')
    .update(JSON.stringify({ ev, METODO: metodo.huella }))
    .digest('hex')
    .slice(0, 16);
}

export function calcularOrbita(ev: EventoCneos, metodo: MetodoCneos): OrbitaCneos {
  const huella = huellaEvento(ev, metodo);
  const reg = registroDe(ev);
  let nominal: ResultadoOrbita;
  try {
    nominal = orbitaDesdeBolido(reg);
  } catch (e) {
    // Sin órbita nominal no se publica nube: se registra el motivo
    return { id: ev.id, huella, error: (e as Error).message };
  }
  const { normal } = crearAzar(semillaDe(ev.id));
  const clones: ResultadoOrbita[] = [];
  let fallidos = 0;
  for (let k = 0; k < N_CLONES; k++) {
    try {
      // Errores de la Tabla 4 aplicados al radiante geocéntrico y a la velocidad (M09)
      clones.push(orbitaDeRadiante(radiantePerturbado(reg, metodo.inc, normal)));
    } catch {
      fallidos++;
    }
  }
  return {
    id: ev.id,
    huella,
    metodo: {
      huella: metodo.huella,
      perturbacion: 'radiante-geocentrico',
      clones_pedidos: N_CLONES,
      clones_fallidos: fallidos,
      semilla: semillaDe(ev.id),
      sigma: {
        v_kms: r6(metodo.inc.sigmaV),
        alfa_grados: r6(metodo.inc.sigmaRaGrados),
        delta_grados: r6(metodo.inc.sigmaDecGrados),
      },
      fuente_sigma: metodo.fuenteSigma,
    },
    epoca_ut_j2000: r6(nominal.elementos.epoca),
    radiante: {
      ra: r6(nominal.radiante.ra),
      dec: r6(nominal.radiante.dec),
      vg: r6(nominal.radiante.vg),
    },
    nominal: aGrados(nominal.elementos),
    clones: clones.map((c) => aGrados(c.elementos)),
  };
}
