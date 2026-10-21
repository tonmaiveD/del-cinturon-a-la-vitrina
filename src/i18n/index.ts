import es from './es.json';

type Clave = keyof typeof es;
/** Traducción de un texto que viene de los datos, con el original del que salió. */
export interface TraduccionDato {
  es: string;
  en?: string;
}
const diccionarios: Record<string, Partial<Record<Clave, string>>> = { es };
const datosPorIdioma: Record<string, Record<string, TraduccionDato>> = {};
let idioma = 'es';

/** Idioma activo de la interfaz (código del diccionario). */
export const idiomaActivo = (): string => idioma;

/** Registra un idioma ya cargado (ver src/i18n/idioma.ts); no lo activa. */
export function registrarIdioma(
  codigo: string,
  interfaz: Partial<Record<Clave, string>>,
  datos: Record<string, TraduccionDato> = {},
): void {
  diccionarios[codigo] = interfaz;
  datosPorIdioma[codigo] = datos;
}

export function fijarIdioma(codigo: string): void {
  if (codigo in diccionarios) idioma = codigo;
}

/** Traduce una clave; reemplaza `{nombre}` con los parámetros dados. Sin traducción: español. */
export function t(clave: Clave, params: Record<string, string | number> = {}): string {
  const texto = diccionarios[idioma]?.[clave] ?? es[clave];
  return texto.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

/**
 * Texto que viene de los datos (nombre de una región, justificación de una asociación…). Se
 * traduce solo si la traducción se hizo sobre este mismo original: si el dato cambió en español,
 * se muestra el español hasta que se revise la traducción (lo detecta un test).
 */
export function tDato(clave: string, original: string): string {
  if (idioma === 'es') return original;
  const tr = datosPorIdioma[idioma]?.[clave];
  return tr && tr.es === original && tr.en ? tr.en : original;
}

/**
 * Cita corta en el idioma activo: la de dos autores se genera con «y» («Granvik y Brown 2018»,
 * citaCorta en src/ui/catalogo.ts) y se muestra con la conjunción del idioma.
 */
export const citaLocal = (cita: string): string =>
  idioma === 'es' ? cita : cita.replace(/ y (?=\p{Lu})/gu, t('cita.y'));
