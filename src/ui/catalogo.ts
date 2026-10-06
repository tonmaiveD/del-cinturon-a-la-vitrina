/**
 * Catálogo de piezas con pedigrí para la escena (lo genera `pipeline/catalogo.ts` a partir de
 * `data/`; el cliente no importa los 25 archivos). Aquí solo hay tipos y reglas puras.
 */

/** Valor numérico con su incertidumbre 1σ (si la fuente la publica). */
export interface NumSigma {
  v: number;
  s?: number;
}

export interface ProbabilidadEscape {
  region: string;
  nombre: string;
  p: number;
  sigma?: number;
}

export interface PiezaCatalogo {
  id: string;
  /** Nombre y si está verificado (los nombres esperan confirmación en MetBull). */
  nombre: { valor: string; verificado: boolean };
  clase: { valor: string; fuente: string };
  grupo: GrupoClase;
  fecha: string;
  /** Posición de referencia de la trayectoria luminosa (no el punto de caída). */
  punto: { lat: number; lon: number; fuente: string } | null;
  orbita: {
    fuente: string;
    a: NumSigma;
    e: NumSigma;
    i: NumSigma;
    nodo: NumSigma;
    omega: NumSigma;
    q?: NumSigma;
  } | null;
  /** Probabilidades de región de escape, agrupadas por fuente (nunca se mezclan fuentes). */
  escape: { fuente: string; regiones: ProbabilidadEscape[] }[];
  /** Asociación con cuerpo progenitor (otra capa: no se mezcla con la región de escape). */
  asociacion:
    | {
        id: string;
        nombre: string;
        confianza: 'alto' | 'medio' | 'especulativo';
        justificacion: string;
        fuentes: string[];
      }
    | { sin: string; fuentes: string[] };
}

export interface ZonaEscape {
  id: string;
  nombre: string;
  a_min: number;
  a_max: number;
  i_min?: number;
  i_max?: number;
  elementos: 'osculadores' | 'propios';
  fuentes: string[];
}

export interface ResonanciaCatalogo {
  id: string;
  nombre: string;
  p: number;
  q: number;
  /** Centro nominal (AU) con a_J osculador de J2000. */
  a: number;
  fuentes: string[];
}

export interface Catalogo {
  piezas: PiezaCatalogo[];
  zonas: ZonaEscape[];
  resonancias: ResonanciaCatalogo[];
  /** Regiones de escape sin geometría publicada leída: solo texto. */
  sin_geometria: { id: string; nombre: string }[];
  /** Cita corta de cada fuente referenciada (la completa está en el diálogo de fuentes). */
  fuentes: Record<string, string>;
}

export const GRUPOS = ['H', 'L', 'LL', 'carbonacea', 'enstatita', 'acondrita', 'varios'] as const;
export type GrupoClase = (typeof GRUPOS)[number];

/**
 * Grupo de la clasificación publicada, solo para filtrar. Si las partes separadas por «/»
 * pertenecen a grupos distintos (caídas heterogéneas o clase disputada) → «varios».
 */
export function grupoClase(clase: string): GrupoClase {
  let previa = '';
  const grupos = new Set(
    clase.split('/').map((parte): GrupoClase => {
      // «H5/6» = H5 o H6: una parte que empieza con dígito hereda las letras de la anterior
      const p = /^\d/.test(parte.trim())
        ? previa.replace(/[\d.].*$/, '') + parte.trim()
        : parte.trim();
      previa = p;
      if (/^LL\d/.test(p)) return 'LL';
      if (/^L\d/.test(p)) return 'L';
      if (/^H\d/.test(p)) return 'H';
      if (/^C/.test(p)) return 'carbonacea';
      if (/^E[HL]?\d/.test(p)) return 'enstatita';
      return 'acondrita';
    }),
  );
  return grupos.size === 1 ? [...grupos][0]! : 'varios';
}

export interface Filtro {
  grupo: GrupoClase | '';
  /** Confianza de la asociación con progenitor; «ninguna» = en `sin_asociacion`. */
  confianza: 'alto' | 'medio' | 'especulativo' | 'ninguna' | '';
}

export function cumpleFiltro(p: PiezaCatalogo, f: Filtro): boolean {
  if (f.grupo && p.grupo !== f.grupo) return false;
  if (f.confianza) {
    const c = 'confianza' in p.asociacion ? p.asociacion.confianza : 'ninguna';
    if (c !== f.confianza) return false;
  }
  return true;
}

/** «Granvik y Brown 2018», «Popova et al. 2013»; sin autores personales, la entidad. */
export function citaCorta(cita: string): string {
  const anio = /\((\d{4})\)/.exec(cita);
  if (!anio) {
    // Sin año: la entidad; si empieza por un autor personal («Cross, D.»), el título
    const partes = cita.split(/\.\s/);
    return /^[^,]+, [A-Z]$/.test(partes[0]!) && partes[1]
      ? partes[1].split(',')[0]!.trim()
      : partes[0]!.trim();
  }
  const autores = cita.slice(0, anio.index).trim();
  const apellidos = autores
    .split(/\.,\s+/)
    .map((x) => x.split(',')[0]!.trim())
    .filter(Boolean);
  const nombre =
    /et al/.test(autores) || apellidos.length > 2
      ? `${apellidos[0]} et al.`
      : apellidos.join(' y ');
  return `${nombre} ${anio[1]}`;
}
