/**
 * Hoja de paneles para pantallas pequeñas, al estilo de Mapas de Apple (M02, revisado con el
 * iPhone del usuario): tres alturas (compacta, media, completa) que se cambian arrastrando el
 * asa o con botones, y pestañas (Explorar, Escena, Info) que muestran una sección a la vez. En
 * la altura compacta quedan el nombre de lo seleccionado y las dos acciones principales; la
 * escena ocupa casi toda la pantalla. En escritorio la hoja no existe visualmente.
 */
import { t } from '../i18n';
import type { AreaLibre } from '../scene/escena';

export type AlturaHoja = 'compacta' | 'media' | 'completa';
export type PestanaHoja = 'explorar' | 'escena' | 'info';

const ALTURAS: AlturaHoja[] = ['compacta', 'media', 'completa'];
/** Desplazamiento mínimo del dedo (px) para que un arrastre cambie la altura. */
const UMBRAL_ARRASTRE = 30;

export function montarHoja() {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const hoja = $('#hoja');
  const cabeza = $('.hoja-cabeza');
  const asa = $<HTMLButtonElement>('#hoja-asa');
  const titulo = $('#hoja-titulo');
  const contenido = $('#hoja-contenido');
  const bRecorrido = $<HTMLButtonElement>('#hoja-recorrido');
  const bVista = $<HTMLButtonElement>('#hoja-vista');
  const botonesPestana = [...document.querySelectorAll<HTMLButtonElement>('[data-pestana-boton]')];

  const altura = () => (hoja.dataset.altura ?? 'compacta') as AlturaHoja;
  const pestana = () => (hoja.dataset.pestana ?? 'explorar') as PestanaHoja;

  function fijarAltura(a: AlturaHoja): void {
    hoja.dataset.altura = a;
    asa.setAttribute('aria-expanded', String(a !== 'compacta'));
    asa.setAttribute('aria-label', t(a === 'completa' ? 'hoja.reducir' : 'hoja.ampliar'));
  }
  function mostrarPestana(p: PestanaHoja): void {
    hoja.dataset.pestana = p;
    for (const b of botonesPestana)
      b.setAttribute('aria-pressed', String(b.dataset.pestanaBoton === p));
    contenido.scrollTop = 0;
  }
  const subir = () => fijarAltura(ALTURAS[Math.min(2, ALTURAS.indexOf(altura()) + 1)]!);
  const bajar = () => fijarAltura(ALTURAS[Math.max(0, ALTURAS.indexOf(altura()) - 1)]!);

  // Asa: clic recorre las alturas; flechas arriba/abajo con el teclado
  let trasArrastre = false;
  asa.addEventListener('click', () => {
    if (trasArrastre) return;
    if (altura() === 'completa') fijarAltura('compacta');
    else subir();
  });
  asa.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') subir();
    else if (e.key === 'ArrowDown') bajar();
    else return;
    e.preventDefault();
    e.stopPropagation(); // no mueven el reloj
  });

  // Arrastre vertical sobre la cabecera de la hoja (salvo sobre sus botones de acción)
  let inicioY: number | undefined;
  cabeza.addEventListener('pointerdown', (e) => {
    const sobre = (e.target as HTMLElement).closest('button');
    if (sobre && sobre !== asa) return;
    inicioY = e.clientY;
    trasArrastre = false;
  });
  window.addEventListener('pointerup', (e) => {
    if (inicioY === undefined) return;
    const dy = e.clientY - inicioY;
    inicioY = undefined;
    if (Math.abs(dy) < UMBRAL_ARRASTRE) return;
    trasArrastre = true; // el clic que sigue al arrastre no cuenta
    window.setTimeout(() => (trasArrastre = false), 0);
    if (dy < 0) subir();
    else bajar();
  });

  // Pestañas: desde la altura compacta, abrir una pestaña sube la hoja
  for (const b of botonesPestana)
    b.addEventListener('click', () => {
      mostrarPestana(b.dataset.pestanaBoton as PestanaHoja);
      if (altura() === 'compacta') fijarAltura('media');
    });

  // Acciones principales en la altura compacta: delegan en los controles del panel
  const recorrido = $<HTMLButtonElement>('#recorrido');
  const saltar = $<HTMLButtonElement>('#saltar');
  const vistas = [...document.querySelectorAll<HTMLButtonElement>('[data-vista]')];
  function reflejar(): void {
    const enAnimacion = !saltar.hidden;
    bRecorrido.textContent = t(enAnimacion ? 'tiempo.saltar' : 'tiempo.recorrido');
    // Sin recorrido disponible (bólidos del CNEOS, carga en curso) la acción no se muestra
    bRecorrido.hidden = !enAnimacion && recorrido.disabled;
    const enTierra = vistas.find((v) => v.dataset.vista === 'tierra')?.getAttribute('aria-pressed');
    bVista.textContent = t(enTierra === 'false' ? 'hoja.ver-tierra' : 'hoja.ver-sistema-solar');
  }
  bRecorrido.addEventListener('click', () => (saltar.hidden ? recorrido : saltar).click());
  bVista.addEventListener('click', () => {
    const destino = bVista.textContent === t('hoja.ver-tierra') ? 'tierra' : 'sistema-solar';
    vistas.find((v) => v.dataset.vista === destino)?.click();
  });
  const observador = new MutationObserver(reflejar);
  for (const el of [recorrido, saltar, ...vistas])
    observador.observe(el, {
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'aria-pressed'],
    });

  fijarAltura('compacta');
  mostrarPestana('explorar');
  reflejar();
  return {
    fijarAltura,
    mostrarPestana,
    altura,
    pestana,
    fijarTitulo: (texto: string) => (titulo.textContent = texto),
    /** ¿Está activa la hoja móvil? (en escritorio no hace nada) */
    activa: () => hojaActiva(hoja),
  };
}
export type ControlHoja = ReturnType<typeof montarHoja>;

/** ¿Está la hoja en modo móvil (fija sobre la escena)? */
const hojaActiva = (hoja: HTMLElement) => getComputedStyle(hoja).position === 'fixed';

/**
 * Rectángulo de la escena que no tapan la cabecera ni la hoja (px de la ventana), o null si
 * los paneles flotan a los lados (escritorio): la cámara se centra en esa zona libre.
 */
export function areaLibre(): AreaLibre | null {
  const hoja = document.querySelector<HTMLElement>('#hoja');
  if (!hoja || !hojaActiva(hoja)) return null;
  const r = hoja.getBoundingClientRect();
  const cab = document.querySelector('.cabecera')?.getBoundingClientRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Hoja lateral (horizontal): ocupa la derecha
  if (r.left > 0 && r.top <= 1) return { arriba: 0, abajo: h, izquierda: 0, derecha: r.left };
  return { arriba: cab?.bottom ?? 0, abajo: Math.min(h, r.top), izquierda: 0, derecha: w };
}
