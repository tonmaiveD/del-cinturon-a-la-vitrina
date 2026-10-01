import es from './es.json';

type Clave = keyof typeof es;
const diccionarios: Record<string, Record<Clave, string>> = { es };
let idioma = 'es';

export function fijarIdioma(codigo: string): void {
  if (codigo in diccionarios) idioma = codigo;
}

/** Traduce una clave; reemplaza `{nombre}` con los parámetros dados. */
export function t(clave: Clave, params: Record<string, string | number> = {}): string {
  const texto = diccionarios[idioma]?.[clave] ?? es[clave];
  return texto.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
