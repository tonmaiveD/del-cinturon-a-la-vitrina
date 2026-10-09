/**
 * Aviso de error visible y recuperable (M07): una sola franja fija, fuera de los bloques
 * plegables, con un botón «Reintentar» cuando el fallo admite reintento. Cada aviso lleva una
 * clave para que solo lo retire quien lo puso (al reintentar con éxito).
 */
import { t } from '../i18n';

let claveActual: string | undefined;

export function avisarError(clave: string, mensaje: string, reintentar?: () => void): void {
  const caja = document.querySelector<HTMLElement>('#aviso-error');
  if (!caja) return;
  claveActual = clave;
  const texto = document.createElement('p');
  texto.textContent = mensaje;
  caja.replaceChildren(texto);
  if (reintentar) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'boton';
    b.textContent = t('error.reintentar');
    b.addEventListener('click', () => {
      quitarAviso(clave);
      reintentar();
    });
    caja.append(b);
  }
  caja.hidden = false;
}

export function quitarAviso(clave: string): void {
  if (clave !== claveActual) return;
  const caja = document.querySelector<HTMLElement>('#aviso-error');
  if (caja) caja.hidden = true;
  claveActual = undefined;
}

/** ¿Puede este navegador crear un contexto WebGL? (lienzo de prueba, no el de la escena). */
export function hayWebgl(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
