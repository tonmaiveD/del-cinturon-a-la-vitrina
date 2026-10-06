/**
 * Eventos de la API Fireball del CNEOS: lectura de la respuesta cruda y clasificación por la
 * fiabilidad de la órbita que se puede calcular (Peña-Asensio et al. 2025, Tabla 4).
 * Sin dependencias de Three.js: lo usan el pipeline y el navegador.
 */
import type { RegistroBolido } from '../core/orbita-bolido';
import type { Vec3 } from '../core/vector';

/**
 * - `orbita`: vector de velocidad, altura y grupo de bajo D_D (año ≥ 2018 o E_i ≥ 0,45 kt).
 * - `orbita-no-fiable`: vector, pero grupo de alto D_D (año < 2018 y E_i < 0,45 kt): no se
 *   calcula órbita (decisión del usuario del 2026-10-06; errores medianos de la Tabla 4).
 * - `sin-altura`: vector sin altura publicada: no se puede situar el estado inicial.
 * - `sin-vector`: ubicación sin vector de velocidad.
 * - `sin-ubicacion`: solo fecha y energía.
 */
export type CalidadEvento =
  'orbita' | 'orbita-no-fiable' | 'sin-altura' | 'sin-vector' | 'sin-ubicacion';

export interface EventoCneos {
  id: string;
  /** Instante del pico de brillo (ISO 8601 UTC). */
  fecha: string;
  /** Energía radiada total (10^10 J), tal como la publica la API. */
  energia_radiada_e10j: number;
  /** Energía de impacto estimada (kt de TNT). */
  impacto_kt: number;
  lat?: number;
  lon?: number;
  alt_km?: number;
  v_kms?: number;
  v_ecef_kms?: Vec3;
  calidad: CalidadEvento;
}

/** Fecha de corte y energía umbral de la Tabla 4 de Peña-Asensio et al. 2025. */
export const CORTE_FECHA = '2018-01-01T00:00:00Z';
export const UMBRAL_KT = 0.45;

export function grupoBajoDd(fecha: string, impactoKt: number): boolean {
  return fecha >= CORTE_FECHA || impactoKt >= UMBRAL_KT;
}

/** «2013-02-15 03:20:33» → «2013-02-15T03:20:33Z». */
export const fechaIso = (f: string) => `${f.replace(' ', 'T')}Z`;
/** Identificador estable a partir de la fecha (única en la API): «cneos-20130215-032033». */
export const idEvento = (f: string) => `cneos-${f.replace(/[-:]/g, '').replace(' ', '-')}`;

export function leerEventos(respuesta: {
  fields: string[];
  data: (string | null)[][];
}): EventoCneos[] {
  const ix = new Map(respuesta.fields.map((k, i) => [k, i]));
  return respuesta.data.map((fila) => {
    const c = (k: string) => fila[ix.get(k)!] ?? null;
    const num = (k: string) => (c(k) === null ? undefined : Number(c(k)));
    const fecha = fechaIso(c('date')!);
    const impacto = num('impact-e')!;
    const lat = num('lat');
    const lon = num('lon');
    const ev: EventoCneos = {
      id: idEvento(c('date')!),
      fecha,
      energia_radiada_e10j: num('energy')!,
      impacto_kt: impacto,
      calidad: 'sin-ubicacion',
    };
    if (lat !== undefined && lon !== undefined) {
      ev.lat = c('lat-dir') === 'S' ? -lat : lat;
      ev.lon = c('lon-dir') === 'W' ? -lon : lon;
      ev.calidad = 'sin-vector';
    }
    if (num('alt') !== undefined) ev.alt_km = num('alt');
    if (num('vel') !== undefined) ev.v_kms = num('vel');
    const v = [num('vx'), num('vy'), num('vz')];
    if (ev.lat !== undefined && v.every((x) => x !== undefined)) {
      ev.v_ecef_kms = v as Vec3;
      ev.calidad =
        ev.alt_km === undefined
          ? 'sin-altura'
          : grupoBajoDd(fecha, impacto)
            ? 'orbita'
            : 'orbita-no-fiable';
    }
    return ev;
  });
}

export function registroDe(ev: EventoCneos): RegistroBolido {
  if (ev.calidad !== 'orbita' && ev.calidad !== 'orbita-no-fiable')
    throw new Error(`${ev.id}: sin datos para calcular la órbita`);
  return {
    fecha: new Date(ev.fecha),
    latGrados: ev.lat!,
    lonGrados: ev.lon!,
    alturaKm: ev.alt_km!,
    vEcefKmS: ev.v_ecef_kms!,
  };
}
