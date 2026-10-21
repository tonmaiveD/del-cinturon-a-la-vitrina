/** Diálogos accesibles (<dialog> nativo): ficha de la pieza y fuentes/créditos. */
import fuentes from '../../data/fuentes.json';
import cneos from '../../data/cneos/chelyabinsk.json';
import pedigri from '../../data/pedigri/chelyabinsk.json';
import { idiomaActivo, t, tDato } from '../i18n';
import { claveLicencia } from '../i18n/datos';
import type { Meteorito } from '../schema';
import { fichaDe, leerFicha, publicable, renderizarFicha } from './ficha';
import { contextoFicha } from './ficha-datos';
// Solo las fichas aprobadas entran en el build de producción (pipeline/fichas-publicables.ts)
import fichasCrudas from 'virtual:fichas';

interface FuenteJson {
  id: string;
  cita: string;
  url?: string;
  doi?: string;
  licencia: string;
  metadatos_verificados: boolean;
}

function elemento<K extends keyof HTMLElementTagNameMap>(tag: K, texto?: string, clase?: string) {
  const el = document.createElement(tag);
  if (texto) el.textContent = texto;
  if (clase) el.className = clase;
  return el;
}

function listaFuentes(ids?: string[]): HTMLUListElement {
  const ul = elemento('ul', undefined, 'lista-fuentes');
  for (const f of (fuentes as FuenteJson[]).filter((x) => !ids || ids.includes(x.id))) {
    const li = elemento('li');
    li.append(elemento('span', f.cita));
    const enlace = f.doi ? `https://doi.org/${f.doi}` : f.url;
    if (enlace) {
      const a = elemento('a', f.doi ? `doi:${f.doi}` : t('fuentes.enlace'));
      a.href = enlace;
      a.rel = 'noopener';
      a.target = '_blank';
      li.append(' ', a);
    }
    const licencia = tDato(claveLicencia(f.licencia), f.licencia);
    li.append(elemento('span', `${t('fuentes.licencia')}: ${licencia}`, 'licencia'));
    if (!f.metadatos_verificados) li.append(elemento('span', t('fuentes.pendiente'), 'pendiente'));
    ul.append(li);
  }
  return ul;
}

/** URL del repositorio, donde se reportan los errores (GitHub Issues; decisión del 2026-10-21). */
export const REPOSITORIO = 'https://github.com/tonmaiveD/del-cinturon-a-la-vitrina';

/**
 * Reporte de un error ya rellenado con lo necesario para reproducirlo: versión, idioma y vista
 * (la dirección solo guarda el estado de la escena). Nada personal; pedir una cuenta de GitHub
 * es lo que cuesta este canal.
 */
export function enlaceReporte(pagina: string, idioma: string): string {
  const cuerpo = t('reporte.cuerpo', { version: __VERSION__.commit, pagina, idioma });
  const q = new URLSearchParams({ title: t('reporte.titulo'), body: cuerpo });
  return `${REPOSITORIO}/issues/new?${q.toString()}`;
}

/** Versión publicada y enlace para reportar un error (M16). */
function bloqueVersion(): HTMLElement {
  const sec = elemento('section', undefined, 'version');
  const fecha = __VERSION__.fecha.slice(0, 10);
  sec.append(
    elemento('h3', t('version.titulo')),
    elemento('p', t('version.texto', { commit: __VERSION__.commit, fecha })),
  );
  const p = elemento('p');
  const a = elemento('a', t('reporte.enlace'));
  a.rel = 'noopener';
  a.target = '_blank';
  // Se arma al pulsar: así lleva la vista del momento, no la de la carga
  a.href = enlaceReporte(location.pathname + location.search, idiomaActivo());
  a.addEventListener('click', () => {
    a.href = enlaceReporte(location.pathname + location.search, idiomaActivo());
  });
  p.append(a, ' ', elemento('span', t('reporte.nota'), 'nota'));
  sec.append(p);
  return sec;
}

function conectar(boton: HTMLButtonElement, dialogo: HTMLDialogElement): void {
  boton.addEventListener('click', () => dialogo.showModal());
  dialogo
    .querySelector<HTMLButtonElement>('[data-cerrar]')!
    .addEventListener('click', () => dialogo.close());
  // Cerrar al pulsar fuera del contenido
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });
}

export function montarDialogos(): void {
  const dFicha = document.querySelector<HTMLDialogElement>('#dialogo-ficha')!;
  const bFicha = document.querySelector<HTMLButtonElement>('#abrir-ficha')!;
  const dFuentes = document.querySelector<HTMLDialogElement>('#dialogo-fuentes')!;
  conectar(document.querySelector<HTMLButtonElement>('#abrir-fuentes')!, dFuentes);
  dFuentes.querySelector('.contenido')!.append(listaFuentes(), bloqueVersion());

  // Cada idioma tiene su ficha y su aprobación; sin ficha en ese idioma, no hay botón
  const cruda = fichaDe(fichasCrudas, 'chelyabinsk', idiomaActivo());
  const ficha = cruda ? leerFicha(cruda) : undefined;
  const enRevision = __VISTA_PREVIA__.split(',').includes(idiomaActivo());
  if (!ficha || !publicable(ficha, import.meta.env.DEV || enRevision)) {
    bFicha.hidden = true;
    return;
  }
  const ctx = contextoFicha(pedigri as unknown as Meteorito, cneos, fuentes as FuenteJson[]);
  const { html, fuentes: usadas } = renderizarFicha(ficha, ctx);
  dFicha.querySelector('#titulo-ficha')!.textContent = t('ficha.titulo', {
    nombre: String(pedigri.nombre_oficial.valor),
    anio: String(pedigri.fecha_caida.valor).slice(0, 4),
  });
  const contenido = dFicha.querySelector('.contenido')!;
  if (ficha.estado === 'borrador') contenido.append(elemento('p', t('ficha.borrador'), 'aviso'));
  const cuerpo = elemento('div', undefined, 'ficha');
  cuerpo.innerHTML = html; // HTML generado por renderizarFicha (escapado) a partir de la plantilla
  contenido.append(
    cuerpo,
    elemento('h3', t('ficha.fuentes')),
    listaFuentes(usadas),
    bloqueExportar(ctx, usadas, dFicha),
  );
  conectar(bFicha, dFicha);
}

/** Licencia de los datos y los textos del proyecto (data/LICENCIA.md). */
const LICENCIA = 'CC BY 4.0';
const PIEZA = 'chelyabinsk';

/** Cita sugerida de la ficha: nombre del proyecto, versión publicada y dirección. */
function citaFicha(): string {
  return t('ficha.cita', {
    anio: __VERSION__.fecha.slice(0, 4),
    nombre: String(pedigri.nombre_oficial.valor),
    version: __VERSION__.commit,
    url: location.origin + location.pathname,
    licencia: LICENCIA,
  });
}

/**
 * Datos de la ficha para descargar (M42): manifiesto (versión, licencia, cita, consulta del
 * CNEOS, qué es medición, cálculo propio o ilustración), las cifras tal como las muestra la ficha
 * con su fuente, las fuentes citadas y el registro del meteorito en el dataset.
 */
export function datosFicha(
  ctx: Record<string, { texto: string; fuente: string }>,
  usadas: string[],
) {
  const repo = `${REPOSITORIO}/blob/main/docs/reportes`;
  return {
    manifiesto: {
      proyecto: 'Del cinturón a la vitrina',
      pieza: PIEZA,
      idioma: idiomaActivo(),
      version: __VERSION__,
      url: location.origin + location.pathname,
      licencia: LICENCIA,
      como_citar: citaFicha(),
      cneos_consultado: cneos.consultado,
      tipos: {
        medicion: t('ficha.tipo.medicion'),
        calculo_propio: t('ficha.tipo.calculo'),
        ilustracion: t('ficha.tipo.ilustracion'),
        reportes: [`${repo}/chelyabinsk.md`, `${repo}/nubes.md`, `${repo}/trazabilidad.md`],
      },
    },
    valores: ctx,
    fuentes: (fuentes as FuenteJson[]).filter((f) => usadas.includes(f.id)),
    meteorito: pedigri,
  };
}

/** Imprimir o guardar en PDF, descargar los datos y cómo citar (M42). */
function bloqueExportar(
  ctx: Record<string, { texto: string; fuente: string }>,
  usadas: string[],
  dialogo: HTMLDialogElement,
): HTMLElement {
  const sec = elemento('section', undefined, 'exportar');
  sec.append(elemento('h3', t('ficha.exportar')), elemento('p', t('ficha.tipos'), 'nota'));
  const acciones = elemento('p', undefined, 'acciones');
  const imprimir = elemento('button', t('ficha.imprimir'), 'boton');
  imprimir.type = 'button';
  imprimir.addEventListener('click', () => {
    // Solo la ficha: la hoja de impresión oculta la escena y los paneles con esta clase. El
    // diálogo modal vive en la capa superior, que no sigue el flujo del documento y cortaría el
    // principio de la ficha: se imprime como diálogo normal y se vuelve a abrir como modal.
    dialogo.close();
    dialogo.show();
    document.body.classList.add('imprimiendo-ficha');
    window.addEventListener(
      'afterprint',
      () => {
        document.body.classList.remove('imprimiendo-ficha');
        dialogo.close();
        dialogo.showModal();
      },
      { once: true },
    );
    window.print();
  });
  const descargar = elemento('button', t('ficha.descargar'), 'boton');
  descargar.type = 'button';
  descargar.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(datosFicha(ctx, usadas), null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ficha-${PIEZA}-${idiomaActivo()}-${__VERSION__.commit}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  acciones.append(imprimir, ' ', descargar);
  sec.append(acciones, elemento('p', citaFicha(), 'cita'));
  return sec;
}
