/** Formatos de los JSON que genera pipeline/cneos-orbitas.ts (los lee el navegador). */
import type { CalidadCneos } from '../schema';
import type { EventoCneos } from './eventos';

/** Percentiles 16, 50 y 84 de la nube Monte Carlo. */
export type Percentiles = [number, number, number];

export interface ResumenOrbita {
  radiante: { ra: number; dec: number; vg: number };
  n: number;
  /** Clones cuya integración falló (no forman parte de la nube). */
  descartados: number;
  hiperbolicas: number;
  /** Solo de los clones elípticos (null si no hay ninguno). */
  a: Percentiles | null;
  e: Percentiles | null;
  i: Percentiles | null;
  q: Percentiles | null;
}

export interface ResumenCneos {
  fuente: string;
  /** Fecha de la última consulta a la API que trajo cambios (se muestra como «última actualización»). */
  consultado: string;
  version_api: string;
  ultimo_evento: string;
  criterio: {
    fuente: string;
    corte_fecha: string;
    umbral_kt: number;
    alto_dd: CalidadCneos['grupos'][number];
  };
  conteos: Record<EventoCneos['calidad'], number>;
  eventos: (EventoCneos & { orbita?: ResumenOrbita | { error: string } })[];
}

/** [a (AU), e, i, Ω, ω, M] en grados, eclíptica J2000, época del impacto. */
export type ElementosCompactos = number[];

/** Órbita que no se pudo calcular (p. ej. la retropropagación no sale de la influencia terrestre). */
export interface OrbitaFallida {
  id: string;
  huella: string;
  error: string;
}

export type OrbitaCneos = OrbitaCalculada | OrbitaFallida;

export interface OrbitaCalculada {
  id: string;
  huella: string;
  metodo: {
    version: number;
    clones_pedidos: number;
    clones_fallidos: number;
    semilla: number;
    sigma: { v_kms: number; alfa_grados: number; delta_grados: number };
    fuente_sigma: string;
  };
  epoca_ut_j2000: number;
  radiante: { ra: number; dec: number; vg: number };
  nominal: ElementosCompactos;
  clones: ElementosCompactos[];
}
