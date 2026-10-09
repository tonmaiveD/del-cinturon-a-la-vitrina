/**
 * Panel del modo CNEOS: fecha de actualización, leyenda, filtros, eventos recientes y detalle del
 * evento seleccionado. Nunca se presenta como tiempo real (principio 4).
 */
import { t } from '../i18n';
import {
  COLOR_LEYENDA,
  comparacionChelyabinsk,
  cumpleFiltroCneos,
  grupoLeyenda,
  prefijoFecha,
  rango,
  recientes,
  type FiltroCneos,
  type GrupoLeyenda,
} from './formato';
import type { ResumenCneos, ResumenOrbita } from './resumen';

type Clave = Parameters<typeof t>[0];
type Evento = ResumenCneos['eventos'][number];

/** Eventos por página de la lista. */
export const POR_PAGINA = 15;
const ENERGIAS_MIN = [0, 0.1, 1, 10];
/** Umbral de clones descartados a partir del cual se avisa de posible sesgo de la nube. */
export const UMBRAL_SESGO = 0.1;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, texto?: string, clase?: string) {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto;
  if (clase) e.className = clase;
  return e;
}
const num = (x: number, dec: number) =>
  x.toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });
/** Valor tal como lo publica el CNEOS (sin redondear; solo formato local). */
const publicado = (x: number) => x.toLocaleString('es', { maximumFractionDigits: 6 });
export const fechaUtc = (iso: string, conHora = true) =>
  new Intl.DateTimeFormat('es', {
    dateStyle: 'long',
    ...(conHora && { timeStyle: 'short' }),
    timeZone: 'UTC',
  }).format(new Date(iso));
const coord = (v: number, pos: string, neg: string) =>
  `${num(Math.abs(v), 1)}° ${v >= 0 ? pos : neg}`;

export const esOrbitaCalculada = (o: Evento['orbita']): o is ResumenOrbita =>
  o !== undefined && !('error' in o);

export function textoCriterio(r: ResumenCneos) {
  const a = r.criterio.alto_dd;
  return {
    anio: r.criterio.corte_fecha.slice(0, 4),
    kt: num(r.criterio.umbral_kt, 2),
    v: num(a.v_kms.mediana, 2),
    alfa: num(a.alfa_g_grados.mediana, 0),
  };
}

function detalle(ev: Evento, r: ResumenCneos, ktChely: number | undefined): HTMLElement {
  const raiz = el('div');
  raiz.append(el('p', t('cneos.evento.titulo', { fecha: fechaUtc(ev.fecha) }), 'pieza-titulo'));
  if (ev.lat !== undefined)
    raiz.append(
      el(
        'p',
        ev.alt_km !== undefined
          ? t('cneos.evento.ubicacion', {
              lat: coord(ev.lat, 'N', 'S'),
              lon: coord(ev.lon!, 'E', 'O'),
              alt: num(ev.alt_km, 1),
            })
          : t('cneos.evento.ubicacion-sin-alt', {
              lat: coord(ev.lat, 'N', 'S'),
              lon: coord(ev.lon!, 'E', 'O'),
            }),
        'nota',
      ),
    );
  else raiz.append(el('p', t('cneos.evento.sin-ubicacion'), 'nota pendiente'));
  if (ev.v_kms !== undefined)
    raiz.append(el('p', t('cneos.evento.velocidad', { v: num(ev.v_kms, 1) }), 'nota'));
  raiz.append(
    el(
      'p',
      t('cneos.evento.energia', {
        e: publicado(ev.energia_radiada_e10j),
        kt: publicado(ev.impacto_kt),
      }),
      'nota',
    ),
  );
  if (ktChely !== undefined) {
    const c = comparacionChelyabinsk(ev.impacto_kt, ktChely);
    raiz.append(
      el(
        'p',
        c
          ? t(c.menor ? 'cneos.evento.comparacion.menor' : 'cneos.evento.comparacion.mayor', {
              factor: c.factor,
              ref: publicado(ktChely),
            })
          : t('cneos.evento.comparacion.igual'),
        'nota',
      ),
    );
  }

  const sec = el('section', undefined, 'capa');
  sec.setAttribute('aria-labelledby', 'titulo-orbita-cneos');
  const h = el('h3', t('cneos.orbita.titulo'));
  h.id = 'titulo-orbita-cneos';
  sec.append(h);
  const o = ev.orbita;
  if (esOrbitaCalculada(o)) {
    sec.append(el('p', t('cneos.orbita.calculada', { n: o.n }), 'nota'));
    const ul = el('ul', undefined, 'datos-orbita');
    ul.append(
      el('li', t('cneos.orbita.a', { v: rango(o.a, 2) })),
      el('li', t('cneos.orbita.e', { v: rango(o.e, 2) })),
      el('li', t('cneos.orbita.i', { v: rango(o.i, 1) })),
      el('li', t('cneos.orbita.q', { v: rango(o.q, 2) })),
    );
    sec.append(ul);
    sec.append(
      el(
        'p',
        t('cneos.orbita.radiante', {
          ra: num(o.radiante.ra, 1),
          dec: num(o.radiante.dec, 1),
          vg: num(o.radiante.vg, 1),
        }),
        'nota',
      ),
    );
    if (o.hiperbolicas > 0)
      sec.append(el('p', t('cneos.orbita.hiperbolicas', { h: o.hiperbolicas, n: o.n }), 'nota'));
    const pedidos = o.n + o.descartados;
    if (o.descartados > UMBRAL_SESGO * pedidos)
      sec.append(
        el('p', t('cneos.orbita.sesgo', { d: o.descartados, p: pedidos }), 'nota pendiente'),
      );
    sec.append(el('p', t('cneos.orbita.metodo'), 'nota'));
  } else if (o && 'error' in o) {
    sec.append(el('p', t('cneos.orbita.error', { motivo: o.error }), 'nota pendiente'));
  } else if (ev.calidad === 'orbita') {
    // Elegible pero aún sin resultado publicado (no debería ocurrir: el pipeline calcula antes)
    sec.append(el('p', t('cneos.orbita.pendiente'), 'nota pendiente'));
  } else if (ev.calidad === 'orbita-no-fiable') {
    sec.append(el('p', t('cneos.orbita.no-verificable', textoCriterio(r)), 'nota pendiente'));
  } else {
    sec.append(el('p', t(`cneos.orbita.${ev.calidad}` as Clave), 'nota'));
  }
  raiz.append(sec, el('p', t('cneos.fuente'), 'nota'));
  return raiz;
}

export function montarPanelCneos(resumen: ResumenCneos, inicial?: string) {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const selGrupo = $<HTMLSelectElement>('#cneos-grupo');
  const selDesde = $<HTMLSelectElement>('#cneos-desde');
  const selEnergia = $<HTMLSelectElement>('#cneos-energia');
  const cuenta = $('#cneos-cuenta');
  const bRestablecer = $<HTMLButtonElement>('#cneos-restablecer');
  const lista = $('#cneos-recientes');
  const caja = $('#cneos-evento');

  $('#cneos-actualizacion').textContent = t('cneos.actualizacion', {
    consultado: fechaUtc(resumen.consultado),
    ultimo: fechaUtc(resumen.ultimo_evento, false),
  });
  const leyenda = $('#cneos-leyenda');
  leyenda.replaceChildren();
  const crit = textoCriterio(resumen);
  // Cuántos registros hay en cada grupo (todos, con o sin ubicación)
  const porGrupo = new Map<GrupoLeyenda, number>();
  for (const e of resumen.eventos)
    porGrupo.set(grupoLeyenda(e), (porGrupo.get(grupoLeyenda(e)) ?? 0) + 1);
  for (const g of Object.keys(COLOR_LEYENDA) as GrupoLeyenda[]) {
    const li = el('li');
    const punto = el('span', undefined, 'punto');
    punto.style.background = COLOR_LEYENDA[g];
    punto.setAttribute('aria-hidden', 'true');
    li.append(
      punto,
      t('cneos.leyenda.cuenta', {
        texto: t(`cneos.leyenda.${g}` as Clave, crit),
        n: porGrupo.get(g) ?? 0,
      }),
    );
    li.dataset.grupo = g;
    leyenda.append(li);
  }
  leyenda.append(el('li', t('cneos.leyenda.tamano'), 'nota'));

  selGrupo.add(new Option(t('filtro.todos'), ''));
  for (const g of Object.keys(COLOR_LEYENDA) as GrupoLeyenda[])
    selGrupo.add(new Option(t(`cneos.leyenda.${g}` as Clave, crit), g));
  const anios = [...new Set(resumen.eventos.map((e) => Number(e.fecha.slice(0, 4))))].sort();
  for (const a of anios) selDesde.add(new Option(String(a), String(a)));
  const desdeInicial = String(anios[0]);
  selDesde.value = desdeInicial;
  for (const kt of ENERGIAS_MIN)
    selEnergia.add(
      new Option(
        kt === 0
          ? t('cneos.energia.cualquiera')
          : t('cneos.energia.min', { kt: num(kt, kt < 1 ? 1 : 0) }),
        String(kt),
      ),
    );

  const ktChely = resumen.eventos.find((e) => e.fecha.startsWith('2013-02-15T03:20'))?.impacto_kt;
  const buscar = $<HTMLInputElement>('#cneos-buscar');
  const bAnterior = $<HTMLButtonElement>('#cneos-pagina-anterior');
  const bSiguiente = $<HTMLButtonElement>('#cneos-pagina-siguiente');
  const textoPagina = $('#cneos-pagina');
  // Todos los registros, del más reciente al más antiguo (también los que no tienen ubicación)
  const todos = recientes(resumen.eventos, resumen.eventos.length);
  const porId = new Map(todos.map((e) => [e.id, e]));
  const situables = todos.filter((e) => e.lat !== undefined);
  const oyentes = new Set<(id: string) => void>();
  const oyentesFiltro = new Set<(ids: Set<string>) => void>();
  const existe = (id?: string) => !!id && porId.has(id);
  let actual = existe(inicial) ? inicial! : situables[0]!.id;
  let pagina = 0;

  const filtro = (): FiltroCneos => ({
    grupo: selGrupo.value as FiltroCneos['grupo'],
    desde: Number(selDesde.value),
    energiaMin: Number(selEnergia.value),
    fecha: buscar.value,
  });
  /** Eventos que cumplen los filtros (lista textual), en orden de fecha descendente. */
  const coincidentes = () => todos.filter((e) => cumpleFiltroCneos(e, filtro()));
  /** Los que además se pueden situar: son los que dibuja el globo. */
  const visibles = () =>
    new Set(
      coincidentes()
        .filter((e) => e.lat !== undefined)
        .map((e) => e.id),
    );

  function poblarLista(irASeleccion = false): void {
    const lista_ = coincidentes();
    const enGlobo = lista_.filter((e) => e.lat !== undefined);
    const fuera = !lista_.some((e) => e.id === actual);
    buscar.setAttribute('aria-invalid', String(prefijoFecha(buscar.value) === null));
    cuenta.textContent = [
      lista_.length === 0
        ? t('cneos.cuenta.vacia', { total: todos.length })
        : t('cneos.cuenta', { n: lista_.length, g: enGlobo.length, total: todos.length }),
      ...(fuera ? [t('cneos.cuenta.fuera')] : []),
    ].join(' ');
    const f = filtro();
    bRestablecer.hidden =
      !f.grupo && selDesde.value === desdeInicial && f.energiaMin === 0 && !buscar.value.trim();
    // Política: la selección se conserva, pero si los filtros la excluyen se dice claramente
    caja.querySelector('.fuera-filtro')?.remove();
    if (fuera) caja.prepend(el('p', t('cneos.fuera-filtro'), 'aviso fuera-filtro'));

    const paginas = Math.max(1, Math.ceil(lista_.length / POR_PAGINA));
    if (irASeleccion && !fuera)
      pagina = Math.floor(lista_.findIndex((e) => e.id === actual) / POR_PAGINA);
    pagina = Math.min(Math.max(0, pagina), paginas - 1);
    textoPagina.textContent = t('cneos.pagina', { p: pagina + 1, n: paginas });
    bAnterior.disabled = pagina === 0;
    bSiguiente.disabled = pagina >= paginas - 1;

    lista.replaceChildren();
    for (const e of lista_.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)) {
      const li = el('li');
      const b = el('button', undefined, 'evento');
      b.type = 'button';
      b.dataset.id = e.id;
      b.setAttribute('aria-pressed', String(e.id === actual));
      const g = grupoLeyenda(e);
      const punto = el('span', undefined, 'punto');
      punto.style.background = COLOR_LEYENDA[g];
      punto.setAttribute('aria-hidden', 'true');
      // El tipo va también en texto: el color no es el único medio (WCAG 1.4.1)
      b.append(
        punto,
        t('cneos.lista.evento', {
          fecha: fechaUtc(e.fecha, false),
          kt: publicado(e.impacto_kt),
          tipo: t(`cneos.lista.${g}` as Clave),
        }),
      );
      b.addEventListener('click', () => seleccionar(e.id));
      li.append(b);
      lista.append(li);
    }
    oyentesFiltro.forEach((fn) => fn(new Set(enGlobo.map((e) => e.id))));
  }
  /** Cambio de filtros o búsqueda: se vuelve a la página que contiene la selección (o a la primera). */
  const alFiltrarLista = () => {
    pagina = 0;
    poblarLista(true);
  };

  let primera = true;
  function seleccionar(id: string): void {
    if (!existe(id)) return;
    actual = id;
    caja.replaceChildren(detalle(porId.get(id)!, resumen, ktChely));
    // El detalle está arriba del panel: al elegir desde la lista o el globo se lleva a la vista
    if (!primera) caja.scrollIntoView({ block: 'nearest' });
    poblarLista(primera);
    primera = false;
    oyentes.forEach((f) => f(id));
  }

  selGrupo.addEventListener('change', alFiltrarLista);
  selDesde.addEventListener('change', alFiltrarLista);
  selEnergia.addEventListener('change', alFiltrarLista);
  buscar.addEventListener('input', alFiltrarLista);
  bAnterior.addEventListener('click', () => {
    pagina--;
    poblarLista();
  });
  bSiguiente.addEventListener('click', () => {
    pagina++;
    poblarLista();
  });
  bRestablecer.addEventListener('click', () => {
    selGrupo.value = '';
    selDesde.value = desdeInicial;
    selEnergia.value = '0';
    buscar.value = '';
    alFiltrarLista();
    selGrupo.focus();
  });
  seleccionar(actual);

  return {
    resumen,
    actual: () => actual,
    evento: (id: string) => porId.get(id),
    visibles,
    seleccionar,
    alSeleccionar: (f: (id: string) => void) => oyentes.add(f),
    alFiltrar: (f: (ids: Set<string>) => void) => oyentesFiltro.add(f),
  };
}
export type PanelCneos = ReturnType<typeof montarPanelCneos>;
