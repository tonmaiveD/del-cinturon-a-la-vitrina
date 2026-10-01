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

  // 3. Hacia atrás hasta salir de la influencia terrestre
  const atras = integrar(derivadaHeliocentrica(), t.ut, y0, t.ut - 60, {
    rtol,
    atol: 1e-16,
    h0: 1e-6,
    alPaso: (tt, y) => {
      const e = Astro.HelioVector(Astro.Body.Earth, Astro.MakeTime(tt));
      return Math.hypot(y[0]! - e.x, y[1]! - e.y, y[2]! - e.z) > distanciaSalida;
    },
  });
  if (!atras.detenido) throw new Error('el bólido no salió de la influencia terrestre en 60 días');

  // Radiante geocéntrico: velocidad relativa a la Tierra en el punto de salida
  const tSal = Astro.MakeTime(atras.t);
  const tierraSal = estadoTierra(tSal);
  const vGeoSal = resta([atras.y[3]!, atras.y[4]!, atras.y[5]!], tierraSal.v);

  // 4. Hacia adelante sin Tierra ni Luna hasta la época del impacto
  const adelante = integrar(derivadaHeliocentrica(SIN_TIERRA), atras.t, atras.y, t.ut, {
    rtol,
    atol: 1e-16,
  });
  const rH: Vec3 = [adelante.y[0]!, adelante.y[1]!, adelante.y[2]!];
  const vH: Vec3 = [adelante.y[3]!, adelante.y[4]!, adelante.y[5]!];
  const elementos = elementosDesdeEstado({ r: eqjAEcl(rH), v: eqjAEcl(vH) }, MU_SOL, t.ut);

  return {
    elementos,
    radiante: radianteDesde(vGeoSal),
    vInercialKmS: (norma(v) * KM_POR_AU) / 86400,
    diasRetro: t.ut - atras.t,
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
