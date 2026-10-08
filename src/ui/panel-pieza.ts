/**
 * Panel de selección de pieza (filtros + lista) y de procedencia. Se monta antes que la escena 3D
 * (no depende de Three.js). Dos capas que nunca se mezclan: región de escape (probabilidades por
 * fuente) y asociación con cuerpo progenitor (con su confianza).
 */
import { t } from '../i18n';
import {
  cumpleFiltro,
  GRUPOS,
  type Catalogo,
  type Filtro,
  type NumSigma,
  type PiezaCatalogo,
} from './catalogo';

type Clave = Parameters<typeof t>[0];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  texto?: string,
  clase?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto;
  if (clase) e.className = clase;
  return e;
}

/** Decimales con los que la fuente publica el valor (no se inventa precisión). */
function decimales(x: number): number {
  const [mantisa, exponente] = String(x).split('e');
  const d = (mantisa!.split('.')[1] ?? '').length;
  return exponente ? Math.max(0, d - Number(exponente)) : d;
}
export const numero = (x: number, dec = decimales(x)) =>
  x.toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });
/**
 * «valor ± σ» sin precisión ficticia: cada número conserva como máximo sus decimales publicados y
 * como máximo los que corresponden a dos cifras significativas de σ (nunca se añaden cifras).
 */
export function conSigma(x: NumSigma, unidad = ''): string {
  if (x.s === undefined || x.s <= 0) return `${numero(x.v)}${unidad}`;
  const decSigma = Math.max(0, 1 - Math.floor(Math.log10(x.s)));
  const v = numero(x.v, Math.min(decimales(x.v), decSigma));
  const s = numero(x.s, Math.min(decimales(x.s), decSigma));
  return `${v} ± ${s}${unidad}`;
}

export const nombrePieza = (p: PiezaCatalogo) => p.nombre.valor;
export const anioPieza = (p: PiezaCatalogo) => p.fecha.slice(0, 4);

export function coordenada(v: number, pos: string, neg: string): string {
  return `${numero(Math.abs(v))}° ${v >= 0 ? pos : neg}`;
}

function bloqueEscape(p: PiezaCatalogo, catalogo: Catalogo): HTMLElement {
  const sec = el('section', undefined, 'capa');
  sec.setAttribute('aria-labelledby', 'titulo-escape');
  const h = el('h3', t('procedencia.escape'));
  h.id = 'titulo-escape';
  sec.append(h, el('p', t('procedencia.escape-nota'), 'nota'));
  if (!p.escape.length) sec.append(el('p', t('procedencia.escape-sin'), 'nota'));
  for (const grupo of p.escape) {
    const fig = el('figure', undefined, 'barras');
    fig.append(
      el(
        'figcaption',
        t('procedencia.segun', { fuente: catalogo.fuentes[grupo.fuente] ?? grupo.fuente }),
      ),
    );
    const ul = el('ul');
    for (const r of [...grupo.regiones].sort((a, b) => b.p - a.p)) {
      const li = el('li');
      const texto =
        r.sigma === undefined ? `${numero(r.p)} %` : `${numero(r.p)} ± ${numero(r.sigma)} %`;
      li.append(el('span', r.nombre, 'region'), el('span', texto, 'valor'));
      const barra = el('span', undefined, 'barra');
      barra.setAttribute('aria-hidden', 'true');
      const relleno = el('span');
      relleno.style.width = `${Math.min(100, Math.max(0, r.p))}%`;
      // Banda ±1σ alrededor del valor (la incertidumbre se muestra)
      if (r.sigma !== undefined) {
        const banda = el('span', undefined, 'banda');
        banda.style.left = `${Math.max(0, r.p - r.sigma)}%`;
        banda.style.width = `${Math.min(100, r.p + r.sigma) - Math.max(0, r.p - r.sigma)}%`;
        barra.append(banda);
      }
      barra.prepend(relleno);
      li.append(barra);
      ul.append(li);
    }
    fig.append(ul);
    sec.append(fig);
  }
  return sec;
}

function bloqueProgenitor(p: PiezaCatalogo, catalogo: Catalogo): HTMLElement {
  const sec = el('section', undefined, 'capa');
  sec.setAttribute('aria-labelledby', 'titulo-progenitor');
  const h = el('h3', t('procedencia.progenitor'));
  h.id = 'titulo-progenitor';
  sec.append(h);
  const a = p.asociacion;
  const citas = a.fuentes.map((f) => catalogo.fuentes[f] ?? f).join('; ');
  if ('confianza' in a) {
    const linea = el('p', undefined, 'asociacion');
    linea.append(
      el('strong', a.nombre),
      ' ',
      el('span', t(`confianza.${a.confianza}` as Clave), `insignia confianza-${a.confianza}`),
    );
    sec.append(linea, el('p', a.justificacion, 'nota'));
  } else {
    sec.append(el('p', t('procedencia.sin-asociacion'), 'asociacion'), el('p', a.sin, 'nota'));
  }
  sec.append(el('p', t('procedencia.fuentes', { fuentes: citas }), 'nota'));
  return sec;
}

export function renderizarProcedencia(p: PiezaCatalogo, catalogo: Catalogo): HTMLElement {
  const raiz = el('div');
  const titulo = el('p', undefined, 'pieza-titulo');
  titulo.append(el('strong', nombrePieza(p)));
  titulo.append(` · ${p.clase.valor} · ${anioPieza(p)}`);
  raiz.append(titulo);
  if (!p.nombre.verificado) raiz.append(el('p', t('pieza.nombre-pendiente'), 'nota pendiente'));
  const f = (id: string) => catalogo.fuentes[id] ?? id;
  raiz.append(
    el(
      'p',
      p.punto
        ? t('pieza.punto', {
            lat: coordenada(p.punto.lat, 'N', 'S'),
            lon: coordenada(p.punto.lon, 'E', 'O'),
            fuente: f(p.punto.fuente),
          })
        : t('pieza.sin-punto'),
      'nota',
    ),
  );
  if (p.orbita) {
    const o = p.orbita;
    raiz.append(
      el(
        'p',
        t('pieza.orbita', {
          a: conSigma(o.a, ' AU'),
          e: conSigma(o.e),
          i: conSigma(o.i, '°'),
          fuente: f(o.fuente),
        }),
        'nota',
      ),
    );
  }
  raiz.append(bloqueEscape(p, catalogo), bloqueProgenitor(p, catalogo));
  return raiz;
}

export function montarPanelPieza(catalogo: Catalogo, inicial: string) {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const selPieza = $<HTMLSelectElement>('#pieza');
  const selGrupo = $<HTMLSelectElement>('#filtro-grupo');
  const selConfianza = $<HTMLSelectElement>('#filtro-confianza');
  const cuenta = $('#pieza-cuenta');
  const procedencia = $('#procedencia');

  selGrupo.add(new Option(t('filtro.todos'), ''));
  for (const g of GRUPOS) {
    const n = catalogo.piezas.filter((p) => p.grupo === g).length;
    if (n) selGrupo.add(new Option(`${t(`grupo.${g}` as Clave)} (${n})`, g));
  }
  selConfianza.add(new Option(t('filtro.todas'), ''));
  for (const c of ['alto', 'medio', 'especulativo', 'ninguna'] as const)
    selConfianza.add(new Option(t(`confianza.${c}` as Clave), c));

  const oyentes = new Set<(id: string) => void>();
  const oyentesFiltro = new Set<(ids: Set<string>) => void>();
  const valida = (id: string) => catalogo.piezas.some((p) => p.id === id);
  let actual = valida(inicial) ? inicial : 'chelyabinsk';

  const filtro = (): Filtro => ({
    grupo: selGrupo.value as Filtro['grupo'],
    confianza: selConfianza.value as Filtro['confianza'],
  });
  const visibles = () =>
    new Set(catalogo.piezas.filter((p) => cumpleFiltro(p, filtro())).map((p) => p.id));

  function poblarLista(): void {
    const ids = visibles();
    selPieza.replaceChildren();
    for (const p of catalogo.piezas.filter((x) => ids.has(x.id)))
      selPieza.add(new Option(`${nombrePieza(p)} (${anioPieza(p)}, ${p.clase.valor})`, p.id));
    // La pieza seleccionada siempre está en la lista, aunque el filtro la excluya
    if (!ids.has(actual)) {
      const p = catalogo.piezas.find((x) => x.id === actual)!;
      const op = new Option(
        t('pieza.fuera-de-filtro', { nombre: `${nombrePieza(p)} (${anioPieza(p)})` }),
        p.id,
      );
      selPieza.add(op, 0);
    }
    selPieza.value = actual;
    cuenta.textContent = t('pieza.cuenta', { n: ids.size, total: catalogo.piezas.length });
    oyentesFiltro.forEach((f) => f(ids));
  }

  function seleccionar(id: string): void {
    if (!valida(id)) return;
    actual = id;
    poblarLista();
    procedencia.replaceChildren(
      renderizarProcedencia(
        catalogo.piezas.find((p) => p.id === id)!,
        catalogo,
      ),
    );
    oyentes.forEach((f) => f(id));
  }

  selPieza.addEventListener('change', () => seleccionar(selPieza.value));
  selGrupo.addEventListener('change', poblarLista);
  selConfianza.addEventListener('change', poblarLista);
  seleccionar(actual);

  return {
    catalogo,
    actual: () => actual,
    visibles,
    seleccionar,
    alSeleccionar: (f: (id: string) => void) => oyentes.add(f),
    alFiltrar: (f: (ids: Set<string>) => void) => oyentesFiltro.add(f),
  };
}
export type PanelPieza = ReturnType<typeof montarPanelPieza>;
