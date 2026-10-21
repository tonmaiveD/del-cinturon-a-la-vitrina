/**
 * Idioma de la página: se elige al cargar (URL o navegador) y el selector recarga la página en
 * el otro idioma; el estado de la escena viaja en la URL, así que no se pierde nada.
 */
import cargadores from 'virtual:idiomas';
import { fijarIdioma, registrarIdioma, t } from '.';
import { idiomaInicial, NOMBRES_IDIOMA } from './eleccion';
import { localeActivo } from './formato';

let explicito: string | undefined;

/** Idioma pedido en la URL (`?lang=`), que se conserva al reescribirla; undefined si no hubo. */
export const idiomaDeUrl = (): string | undefined => explicito;

export const idiomasDisponibles = (): string[] => ['es', ...Object.keys(cargadores)];

/** Carga y activa el idioma inicial (antes de escribir ningún texto). */
export async function prepararIdioma(): Promise<void> {
  const eleccion = idiomaInicial(location.search, navigator.languages, idiomasDisponibles());
  explicito = eleccion.explicito;
  if (eleccion.idioma !== 'es') {
    try {
      const { interfaz, datos } = await cargadores[eleccion.idioma]!();
      registrarIdioma(eleccion.idioma, interfaz, datos);
      fijarIdioma(eleccion.idioma);
    } catch {
      // Sin el diccionario, la página sigue en español
    }
  }
  document.documentElement.lang = localeActivo();
  document.title = t('app.titulo');
}

/** Selector de idioma de la cabecera; oculto mientras solo haya español publicado. */
export function montarSelectorIdioma(actual: string): void {
  const sel = document.querySelector<HTMLSelectElement>('#idioma');
  if (!sel) return;
  const disponibles = idiomasDisponibles();
  sel.closest<HTMLElement>('.idioma')!.hidden = disponibles.length < 2;
  for (const c of disponibles) sel.add(new Option(NOMBRES_IDIOMA[c] ?? c, c));
  sel.value = actual;
  // En pantallas pequeñas la cabecera se reduce al título: el selector pasa a la pestaña Info
  const caja = sel.closest<HTMLElement>('.idioma')!;
  const enCabecera = caja.parentElement!;
  const pie = document.querySelector<HTMLElement>('[data-pestana="info"].pie');
  const pequena = window.matchMedia('(max-width: 640px)');
  const ubicar = () => (pequena.matches && pie ? pie.append(caja) : enCabecera.append(caja));
  ubicar();
  pequena.addEventListener('change', ubicar);
  sel.addEventListener('change', () => {
    const u = new URL(location.href);
    u.searchParams.set('lang', sel.value);
    location.assign(u.toString());
  });
}
