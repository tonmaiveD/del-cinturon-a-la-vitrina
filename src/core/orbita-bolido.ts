/**
 * Órbita heliocéntrica de un bólido a partir de un registro tipo CNEOS.
 *
 * 1. Posición geocéntrica del pico de brillo (lat/lon geodésicas, altura) en EQJ.
 * 2. Velocidad: vector "Earth centered" rotado de ECEF a EQJ. Hipótesis:
 *    - 'ecef-relativa': medida respecto a la Tierra en rotación → se suma ω × r.
 *    - 'inercial': ya es inercial, solo con ejes alineados a ECEF en ese instante.
 * 3. Retropropagación N-cuerpos (Sol + planetas + Luna) hasta `distanciaSalida` de la Tierra.
 * 4. Propagación hacia adelante sin Tierra ni Luna hasta la época del impacto, para dar
 *    elementos osculadores comparables con los "pre-atmosféricos" publicados (sin la
 *    deflexión terrestre).
 * También se calcula el método analítico de atracción cenital como comparación.
 */
import * as Astro from 'astronomy-engine';
import { derivadaHeliocentrica, gm, PERTURBADORES_ENCUENTRO } from './dinamica';
import { integrar } from './integrador';
import { elementosDesdeEstado, type Elementos } from './kepler';
import { ecefAEqj, eqjAEcl, estadoPuntoTerrestre, KMS_A_AUD, KM_POR_AU } from './marcos';
import { escala, norma, punto, resta, suma, unitario, type Vec3 } from './vector';

export type HipotesisMarco = 'ecef-relativa' | 'inercial';

export interface RegistroBolido {
  /** Instante del pico de brillo. */
  fecha: Date;
  latGrados: number;
  lonGrados: number;
  alturaKm: number;
  /** Velocidad "Earth centered" en km/s, ejes ECEF. */
  vEcefKmS: Vec3;
}

export interface Radiante {
  /** Ascensión recta y declinación J2000 (grados) del punto de procedencia. */
  ra: number;
  dec: number;
  /** Velocidad geocéntrica fuera de la atracción terrestre (km/s). */
  vg: number;
}

export interface ResultadoOrbita {
  /** Elementos eclípticos J2000 en la época del impacto (días UT desde J2000). */
  elementos: Elementos;
  radiante: Radiante;
  /** Velocidad inercial geocéntrica en el pico de brillo (km/s). */
  vInercialKmS: number;
  /** Días integrados hacia atrás hasta salir de la influencia terrestre. */
  diasRetro: number;
}

export interface OpcionesOrbita {
  hipotesis?: HipotesisMarco;
  /** Distancia geocéntrica (AU) a la que se considera fuera de la influencia terrestre. */
  distanciaSalida?: number;
  rtol?: number;
}

const MU_SOL = gm('Sun');
const SIN_TIERRA = PERTURBADORES_ENCUENTRO.filter(
  (p) => p.cuerpo !== 'Earth' && p.cuerpo !== 'Moon',
);

/** Distancia por defecto: 0.05 AU ≈ 5 radios de Hill terrestres (~7.5·10⁶ km). */
export const DISTANCIA_SALIDA_AU = 0.05;

function estadoTierra(t: Astro.AstroTime): { r: Vec3; v: Vec3 } {
  const s = Astro.HelioState(Astro.Body.Earth, t);
  return { r: [s.x, s.y, s.z], v: [s.vx, s.vy, s.vz] };
}

function radianteDesde(vGeoAud: Vec3): Radiante {
  const procedencia = unitario(escala(vGeoAud, -1));
  const ra = ((Math.atan2(procedencia[1], procedencia[0]) * 180) / Math.PI + 360) % 360;
  const dec = (Math.asin(procedencia[2]) * 180) / Math.PI;
  return { ra, dec, vg: (norma(vGeoAud) * KM_POR_AU) / 86400 };
}

/** Estado geocéntrico inercial EQJ (AU, AU/día) en el pico de brillo. */
export function estadoGeocentrico(reg: RegistroBolido, hipotesis: HipotesisMarco) {
  const t = Astro.MakeTime(reg.fecha);
  const punto0 = estadoPuntoTerrestre(reg.latGrados, reg.lonGrados, reg.alturaKm * 1000, t);
  const vRot = ecefAEqj(escala(reg.vEcefKmS, KMS_A_AUD), t);
  const v = hipotesis === 'ecef-relativa' ? suma(vRot, punto0.v) : vRot;
  return { t, r: punto0.r, v };
}

export function orbitaDesdeBolido(
  reg: RegistroBolido,
  opciones: OpcionesOrbita = {},
): ResultadoOrbita {
  const {
    hipotesis = 'ecef-relativa',
    distanciaSalida = DISTANCIA_SALIDA_AU,
    rtol = 1e-11,
  } = opciones;
  const { t, r, v } = estadoGeocentrico(reg, hipotesis);
  const tierra = estadoTierra(t);
  const y0 = [...suma(tierra.r, r), ...suma(tierra.v, v)];
  const { elementos, vGeoSal, tSalida } = elementosSinTierra(y0, t.ut, t.ut, distanciaSalida, rtol);

  return {
    elementos,
    radiante: radianteDesde(vGeoSal),
    vInercialKmS: (norma(v) * KM_POR_AU) / 86400,
    diasRetro: t.ut - tSalida,
  };
}

/**
 * Elementos "pre-encuentro" de una partícula cerca de la Tierra: desde un estado heliocéntrico EQJ
 * en `tEstadoUt`, retropropaga con N cuerpos hasta `distanciaSalida` AU de la Tierra y vuelve hacia
 * adelante sin Tierra ni Luna hasta `tEpocaUt`. Devuelve elementos eclípticos J2000 en esa época.
 * Es la definición de los elementos "pre-atmosféricos" publicados (sin la deflexión terrestre).
 */
export function elementosSinTierra(
  y0: ArrayLike<number>,
  tEstadoUt: number,
  tEpocaUt: number,
  distanciaSalida = DISTANCIA_SALIDA_AU,
  rtol = 1e-11,
): { elementos: Elementos; vGeoSal: Vec3; tSalida: number } {
  const atras = integrar(derivadaHeliocentrica(), tEstadoUt, y0, tEstadoUt - 60, {
    rtol,
    atol: 1e-16,
    h0: 1e-6,
    alPaso: (tt, y) => {
      const e = Astro.HelioVector(Astro.Body.Earth, Astro.MakeTime(tt));
      return Math.hypot(y[0]! - e.x, y[1]! - e.y, y[2]! - e.z) > distanciaSalida;
    },
  });
  if (!atras.detenido) throw new Error('el objeto no salió de la influencia terrestre en 60 días');

  // Velocidad relativa a la Tierra en el punto de salida (para el radiante geocéntrico)
  const tierraSal = estadoTierra(Astro.MakeTime(atras.t));
  const vGeoSal = resta([atras.y[3]!, atras.y[4]!, atras.y[5]!], tierraSal.v);

  const adelante = integrar(derivadaHeliocentrica(SIN_TIERRA), atras.t, atras.y, tEpocaUt, {
    rtol,
    atol: 1e-16,
  });
  const rH: Vec3 = [adelante.y[0]!, adelante.y[1]!, adelante.y[2]!];
  const vH: Vec3 = [adelante.y[3]!, adelante.y[4]!, adelante.y[5]!];
  return {
    elementos: elementosDesdeEstado({ r: eqjAEcl(rH), v: eqjAEcl(vH) }, MU_SOL, tEpocaUt),
    vGeoSal,
    tSalida: atras.t,
  };
}

/**
 * Método clásico de atracción cenital (Whipple & Jacchia 1957; Ceplecha 1987), solo para
 * comparar: corrige módulo y dirección de la velocidad por la gravedad terrestre y suma la
 * velocidad heliocéntrica de la Tierra en su centro.
 */
export function orbitaAtraccionCenital(
  reg: RegistroBolido,
  hipotesis: HipotesisMarco = 'ecef-relativa',
) {
  const { t, r, v } = estadoGeocentrico(reg, hipotesis);
  const muT = gm('Earth');
  const vInf = norma(v);
  const vg = Math.sqrt(vInf * vInf - (2 * muT) / norma(r));
  // Distancia cenital del radiante aparente: ángulo entre la vertical y la procedencia
  const vertical = unitario(r);
  const procedencia = unitario(escala(v, -1));
  const z = Math.acos(punto(vertical, procedencia));
  const dz = 2 * Math.atan(((vInf - vg) / (vInf + vg)) * Math.tan(z / 2));
  // Rotar la procedencia alejándola de la vertical un ángulo dz, en el plano (vertical, procedencia)
  const eje = unitario(resta(procedencia, escala(vertical, Math.cos(z))));
  const z2 = z + dz;
  const procCorr = suma(escala(vertical, Math.cos(z2)), escala(eje, Math.sin(z2)));
  const vGeo = escala(procCorr, -vg);
  const tierra = estadoTierra(t);
  const vH = suma(tierra.v, vGeo);
  const elementos = elementosDesdeEstado({ r: eqjAEcl(tierra.r), v: eqjAEcl(vH) }, MU_SOL, t.ut);
  return { elementos, radiante: radianteDesde(vGeo) };
}

/**
 * Inverso de la atracción cenital: a partir de un radiante geocéntrico (α, δ J2000, grados) y la
 * velocidad geocéntrica v_g (km/s), reconstruye el estado inercial en un punto de la trayectoria
 * (lat/lon geodésicas, altura en km) y devuelve los elementos sin Tierra calculados con N cuerpos.
 * Sirve para medir cuánto se aparta el método analítico de una integración numérica.
 */
export interface EntradaRadiante {
  fecha: Date;
  latGrados: number;
  lonGrados: number;
  alturaKm: number;
  raGrados: number;
  decGrados: number;
  vgKmS: number;
}

/**
 * Estado heliocéntrico (EQJ, AU y AU/día) en el punto de referencia, a partir del radiante
 * geocéntrico y v_g (inverso de la atracción cenital). `t` es el instante de referencia.
 */
export function estadoDesdeRadianteGeocentrico(entrada: EntradaRadiante): {
  t: Astro.AstroTime;
  y0: number[];
} {
  const t = Astro.MakeTime(entrada.fecha);
  const r = estadoPuntoTerrestre(
    entrada.latGrados,
    entrada.lonGrados,
    entrada.alturaKm * 1000,
    t,
  ).r;
  const ra = (entrada.raGrados * Math.PI) / 180;
  const dec = (entrada.decGrados * Math.PI) / 180;
  const procedenciaG: Vec3 = [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  ];
  const vg = entrada.vgKmS * KMS_A_AUD;
  const v = Math.sqrt(vg * vg + (2 * gm('Earth')) / norma(r));
  const vertical = unitario(r);
  const zg = Math.acos(punto(vertical, procedenciaG));
  // z aparente: z_g = z + Δz, con tan(Δz/2) = (v − v_g)/(v + v_g)·tan(z/2) (iteración de punto fijo)
  let z = zg;
  for (let k = 0; k < 50; k++) z = zg - 2 * Math.atan(((v - vg) / (v + vg)) * Math.tan(z / 2));
  const eje = unitario(resta(procedenciaG, escala(vertical, Math.cos(zg))));
  const procedencia = suma(escala(vertical, Math.cos(z)), escala(eje, Math.sin(z)));
  const vel = escala(procedencia, -v);
  const tierra = estadoTierra(t);
  return { t, y0: [...suma(tierra.r, r), ...suma(tierra.v, vel)] };
}

export function orbitaDesdeRadianteGeocentrico(entrada: EntradaRadiante): Elementos {
  const { t, y0 } = estadoDesdeRadianteGeocentrico(entrada);
  return elementosSinTierra(y0, t.ut, t.ut).elementos;
}
