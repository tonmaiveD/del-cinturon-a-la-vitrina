/** Diálogos accesibles (<dialog> nativo): ficha de la pieza y fuentes/créditos. */
import fuentes from '../../data/fuentes.json';
import cneos from '../../data/cneos/chelyabinsk.json';
import pedigri from '../../data/pedigri/chelyabinsk.json';
import { t } from '../i18n';
import type { Meteorito } from '../schema';
import { leerFicha, publicable, renderizarFicha } from './ficha';
import { contextoFicha } from './ficha-datos';
// Solo las fichas aprobadas entran en el build de producción (pipeline/fichas-publicables.ts)
import fichasCrudas from 'virtual:fichas';

/** Número de clones mostrados (coincide con public/data/chelyabinsk-orbitas.json). */
const N_CLONES = 300;

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
    li.append(elemento('span', `${t('fuentes.licencia')}: ${f.licencia}`, 'licencia'));
    if (!f.metadatos_verificados) li.append(elemento('span', t('fuentes.pendiente'), 'pendiente'));
    ul.append(li);
  }
  return ul;
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
  dFuentes.querySelector('.contenido')!.append(listaFuentes());

  const cruda = Object.entries(fichasCrudas).find(([ruta]) =>
    ruta.endsWith('/chelyabinsk.md'),
  )?.[1];
  const ficha = cruda ? leerFicha(cruda) : undefined;
  if (!ficha || !publicable(ficha, import.meta.env.DEV)) {
    bFicha.hidden = true;
    return;
  }
  const { html, fuentes: usadas } = renderizarFicha(
    ficha,
    contextoFicha(pedigri as unknown as Meteorito, cneos, N_CLONES),
  );
  dFicha.querySelector('#titulo-ficha')!.textContent = t('ficha.titulo', {
    nombre: String(pedigri.nombre_oficial.valor),
    anio: String(pedigri.fecha_caida.valor).slice(0, 4),
  });
  const contenido = dFicha.querySelector('.contenido')!;
  if (ficha.estado === 'borrador') contenido.append(elemento('p', t('ficha.borrador'), 'aviso'));
  const cuerpo = elemento('div', undefined, 'ficha');
  cuerpo.innerHTML = html; // HTML generado por renderizarFicha (escapado) a partir de la plantilla
  contenido.append(cuerpo, elemento('h3', t('ficha.fuentes')), listaFuentes(usadas));
  conectar(bFicha, dFicha);
}
