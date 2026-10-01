import { t } from '../i18n';

type Clave = Parameters<typeof t>[0];

/** Rellena los elementos marcados con data-i18n / data-i18n-aria. */
export function aplicarTextos(raiz: ParentNode = document): void {
  raiz.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Clave);
  });
  raiz.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as Clave));
  });
}
