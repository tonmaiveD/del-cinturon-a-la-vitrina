import { Raycaster, Vector2, Vector3 } from 'three';
import cneos from '../data/cneos/chelyabinsk.json';
import pedigri from '../data/pedigri/chelyabinsk.json';
import { crearSecuencia, type Paso } from './camera/coreografia';
import { t } from './i18n';
import { PLANETAS } from './scene/cuerpos';
import type { PanelCneos } from './cneos/panel';
import type { OrbitaCneos } from './cneos/resumen';
import { crearCatalogoSolar } from './scene/catalogo-solar';
import { crearBolidosTierra, type BolidosTierra } from './scene/cneos-tierra';
import { crearNubeCneos } from './scene/cneos-solar';
import { ALTURA_INICIO_KM } from './scene/trayectoria-entrada';
import { crearMarcadoresTierra } from './scene/catalogo-tierra';
import { crearMotor, type NombreVista } from './scene/escena';
import { crearVistaSistemaSolar, EXAGERACION, type DatosOrbitas } from './scene/sistema-solar';
import { crearVistaTierra, type DatosBolido } from './scene/tierra';
import type { Muestra } from './timeline/interpolacion';
import { crearReloj, VELOCIDADES } from './timeline/reloj';
import { escribirEstadoUrl, leerEstadoUrl, type Modo } from './ui/estado-url';
import type { ControlModo } from './ui/modo';
import { coordenada, nombrePieza, type PanelPieza } from './ui/panel-pieza';

type Clave = Parameters<typeof t>[0];
const DIA_MS = 86400000;

function registroCneos(): DatosBolido {
  const { fields, data } = cneos.respuesta;
  const fila = data[0]!;
  const c = (k: string) => fila[fields.indexOf(k)]!;
  const signo = (v: string, dir: string, neg: string) => (dir === neg ? -1 : 1) * Number(v);
  return {
    fecha: new Date(c('date').replace(' ', 'T') + 'Z'),
    latGrados: signo(c('lat'), c('lat-dir'), 'S'),
    lonGrados: signo(c('lon'), c('lon-dir'), 'W'),
    alturaKm: Number(c('alt')),
    vEcefKmS: [Number(c('vx')), Number(c('vy')), Number(c('vz'))],
  };
}

/** Radio del meteoroide (km) solo si el dataset lo tiene verificado. */
function radioMeteoroideKm(): number | undefined {
  const d = (pedigri as { diametro_preatmosferico?: { valor: number; estado: string } })
    .diametro_preatmosferico;
  return d && d.estado === 'verificado' ? d.valor / 2000 : undefined;
}

const formatoFecha = (d: Date) =>
  new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(
    d,
  );
const coord = (v: number, pos: string, neg: string) =>
  `${Math.abs(v).toLocaleString('es', { maximumFractionDigits: 1 })}° ${v >= 0 ? pos : neg}`;

export interface DatosEscena {
  orbitas: DatosOrbitas;
  trayectoria: { helio_ecl_au: Muestra[]; geo_eqj_km: Muestra[] };
}

import { cargarJson, urlTextura } from './ui/recursos';

/** Arranca la parte 3D (se carga con import() dinámico desde main.ts). */
export async function iniciar3D(
  datosPromesa: Promise<DatosEscena>,
  panelPromesa: Promise<PanelPieza>,
  cneosCtl: { modo: ControlModo; asegurarCneos: () => Promise<PanelCneos> },
): Promise<void> {
  const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>('#escena');
  const descripcion = $('#descripcion');
  const bolido = registroCneos();
  /** Instante de referencia de la pieza seleccionada (Chelyabinsk: pico de brillo CNEOS). */
  let impacto = bolido.fecha.getTime();

  let orbitas: DatosOrbitas;
  let trayectoria: DatosEscena['trayectoria'];
  let panel: PanelPieza;
  try {
    [{ orbitas, trayectoria }, panel] = await Promise.all([datosPromesa, panelPromesa]);
  } catch {
    descripcion.textContent = t('error.datos');
    return;
  }

  const motor = crearMotor(canvas, $('#etiquetas'));
  const movil = window.matchMedia('(max-width: 900px)').matches;
  const radioMet = radioMeteoroideKm();
  const tierra = crearVistaTierra(
    bolido,
    [urlTextura(1024), urlTextura(movil ? 2048 : 4096)],
    trayectoria.geo_eqj_km,
    radioMet,
  );
  const camT = motor.registrar('tierra', tierra.escena, 1e-4, 2e3, (cam) => tierra.actualizar(cam));
  motor.etiqueta(t('etiqueta.bolido'), tierra.marcador, 'bolido');
  motor.etiqueta(t('etiqueta.meteoroide'), tierra.meteoroide, 'bolido');
  const { catalogo } = panel;
  const piezaDe = (id: string) => catalogo.piezas.find((p) => p.id === id)!;
  const marcadores = crearMarcadoresTierra(tierra.globo, catalogo.piezas);
  const etiquetaCaida = motor.etiqueta('', marcadores.resalte, 'seleccion');

  // Encuadres de referencia
  const aspecto = canvas.clientWidth / canvas.clientHeight;
  /** Dirección (EQJ) hacia la que mira la cámara de la vista terrestre. */
  let dirBolido = tierra.posicionBolido().normalize();
  const medioFovH = Math.atan(Math.tan((camT.camara.fov * Math.PI) / 360) * Math.min(1, aspecto));
  const distTierra = Math.max(3.2, 1.25 / Math.sin(medioFovH));
  const ORIGEN = new Vector3();
  const encuadreTierra = () => ({
    pos: dirBolido.clone().multiplyScalar(distTierra),
    obj: ORIGEN.clone(),
  });
  const encuadreSolar = () => ({
    // Chelyabinsk: encuadre del recorrido; resto: más amplio, para ver el cinturón y las regiones
    pos: new Vector3(0, 2.6, 2.2)
      .multiplyScalar(aspecto < 0.8 ? 1.9 : 1)
      .multiplyScalar(modo === 'pedigri' && panel.actual() === 'chelyabinsk' ? 1 : 1.7),
    obj: ORIGEN.clone(),
  });
  function fijarCamara(vista: NombreVista, pos: Vector3, obj: Vector3): void {
    const c = vista === 'tierra' ? camT : asegurarSolar().camS;
    c.camara.position.copy(pos);
    c.controles.target.copy(obj);
    c.camara.lookAt(obj);
  }
  camT.controles.minDistance = 1.02;
  camT.controles.maxDistance = 400;

  // Estado inicial (URL)
  const inicial = leerEstadoUrl(location.search, {
    pieza: panel.actual(),
    // Sin `t` en la URL, cada pieza arranca en su propio instante de impacto (aplicarPieza)
    t: undefined,
    vista: 'tierra',
    escalaVisual: true,
  });
  const reloj = crearReloj(impacto - 365 * DIA_MS, impacto, inicial.t ?? impacto);
  let vista: NombreVista = inicial.vista;
  /** Modo de la escena: meteoritos con pedigrí o bólidos del CNEOS (se activa al cargar sus datos). */
  let modo: Modo = 'pedigri';
  let panelCneos: PanelCneos | undefined;
  let bolidos: BolidosTierra | undefined;
  let etiquetaBolido: ReturnType<typeof motor.etiqueta> | undefined;
  // Trayectorias animadas de las piezas con pedigrí (calculadas en el pipeline, una por archivo)
  interface TrayectoriaPieza {
    id: string;
    instante_referencia: string;
    punto: { lat: number; lon: number; altura_km: number };
    helio_ecl_au: Muestra[];
    geo_eqj_km: Muestra[];
  }
  let indiceTray = new Set<string>();
  const cacheTray = new Map<string, Promise<TrayectoriaPieza>>();
  /** Trayectoria de la pieza seleccionada (no Chelyabinsk), ya cargada. */
  let trayPieza: TrayectoriaPieza | null = null;
  /** La escena tiene cargada una trayectoria distinta de la de Chelyabinsk. */
  let escenaConOtra = false;
  let pedidoTray = 0;
  /** Clones dibujados en la nube del bólido seleccionado (para la descripción). */
  let nClonesCneos = 0;
  let pedidoOrbita = 0;
  let escalaVisual = inicial.escalaVisual;
  fijarCamara('tierra', encuadreTierra().pos, ORIGEN);

  // Vista del sistema solar: se construye bajo demanda (o en reposo tras el primer cuadro) para
  // no retrasar la carga inicial con las 300 órbitas y las de los planetas.
  type VistaSolar = ReturnType<typeof crearVistaSistemaSolar>;
  type CapaCatalogo = ReturnType<typeof crearCatalogoSolar>;
  let solarCreada:
    | {
        solar: VistaSolar;
        camS: ReturnType<typeof motor.registrar>;
        cat: CapaCatalogo;
        etiquetaNube: ReturnType<typeof motor.etiqueta>;
        nubeCneos: ReturnType<typeof crearNubeCneos>;
      }
    | undefined;
  function asegurarSolar() {
    if (solarCreada) return solarCreada;
    const solar = crearVistaSistemaSolar(bolido.fecha, orbitas, trayectoria.helio_ecl_au, radioMet);
    const cat = crearCatalogoSolar(catalogo);
    solar.escena.add(cat.grupo);
    const camS = motor.registrar('sistema-solar', solar.escena, 1e-6, 200);
    camS.controles.maxDistance = 30;
    motor.etiqueta(t('etiqueta.sol'), solar.sol);
    motor.etiqueta(t('etiqueta.meteoroide'), solar.meteoroide, 'bolido');
    for (const p of PLANETAS)
      motor.etiqueta(t(`planeta.${p.clave}` as Clave), solar.mallas.get(p.clave)!);
    for (const a of cat.anclas) motor.etiqueta(t(`zona.${a.texto}` as Clave), a.objeto, 'region');
    const etiquetaNube = motor.etiqueta('', cat.anclaSeleccion, 'seleccion');
    const nubeCneos = crearNubeCneos();
    nubeCneos.grupo.visible = false;
    solar.escena.add(nubeCneos.grupo);
    motor.etiqueta(t('etiqueta.nube.cneos'), nubeCneos.ancla, 'seleccion');
    solarCreada = { solar, camS, cat, etiquetaNube, nubeCneos };
    aplicarPiezaSolar();
    if (modo === 'cneos') aplicarModoSolar();
    cat.filtrar(panel.visibles());
    solarCreada?.solar.aplicarEscala(escalaVisual);
    solar.actualizarTiempo(new Date(reloj.estado().t));
    fijarCamara('sistema-solar', encuadreSolar().pos, ORIGEN);
    motor.activar(motor.activa()); // oculta las etiquetas nuevas si la vista no está activa
    return solarCreada;
  }

  // Controles del panel
  const avisoEscala = $('#aviso-escala');
  const interruptor = $<HTMLButtonElement>('#escala');
  const botonesVista = [...document.querySelectorAll<HTMLButtonElement>('[data-vista]')];
  const bRecorrido = $<HTMLButtonElement>('#recorrido');
  const bSaltar = $<HTMLButtonElement>('#saltar');
  const bReproducir = $<HTMLButtonElement>('#reproducir');
  const bImpacto = $<HTMLButtonElement>('#impacto');
  const selVelocidad = $<HTMLSelectElement>('#velocidad');
  const deslizador = $<HTMLInputElement>('#fecha');
  const fechaTexto = $('#fecha-texto');
  const fundido = $('#fundido');
  const notaRecorrido = $('#nota-recorrido');
  const avisoMarcadores = $('#aviso-marcadores');
  const bFicha = $<HTMLButtonElement>('#abrir-ficha');
  const fichaDisponible = !bFicha.hidden;
  for (const v of VELOCIDADES)
    selVelocidad.add(new Option(t(`velocidad.${v}` as Clave), String(v)));
  selVelocidad.value = String(reloj.estado().velocidad);

  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');

  function textoFecha(ms: number): string {
    const dias = (impacto - ms) / DIA_MS;
    // Chelyabinsk y los bólidos del CNEOS tienen pico de brillo; las demás piezas, instante de referencia
    const chely = modo === 'cneos' || panel.actual() === 'chelyabinsk';
    const rel =
      dias < 1 / 1440
        ? t(chely ? 'tiempo.en-impacto' : 'tiempo.en-referencia')
        : t(chely ? 'tiempo.antes' : 'tiempo.antes-referencia', {
            dias:
              dias >= 1
                ? `${dias.toLocaleString('es', { maximumFractionDigits: 1 })} d`
                : `${(dias * 24).toLocaleString('es', { maximumFractionDigits: 1 })} h`,
          });
    return t('tiempo.relativo', { fecha: formatoFecha(new Date(ms)), rel });
  }

  const fuenteCorta = (id: string) => catalogo.fuentes[id] ?? id;
  function descripcionRegiones(): string {
    const zona = (id: string) => catalogo.zonas.find((z) => z.id === id);
    return t('desc.regiones', {
      f_hungaria: (zona('hungaria')?.fuentes ?? []).map(fuenteCorta).join('; '),
      f_phocaea: (zona('phocaea')?.fuentes ?? []).map(fuenteCorta).join('; '),
      resonancias: catalogo.resonancias.map((r) => `${r.p}:${r.q}`).join(', '),
    });
  }
  function descripcionCneos(): string {
    const ev = panelCneos!.evento(panelCneos!.actual())!;
    const fecha = formatoFecha(new Date(impacto));
    if (vista === 'tierra')
      return t('desc.tierra.cneos', {
        fecha,
        n: panelCneos!.visibles().size,
        tray:
          ev.v_ecef_kms && ev.alt_km !== undefined
            ? t('desc.tierra.cneos.tray', { alto: ALTURA_INICIO_KM })
            : '',
        consultado: formatoFecha(new Date(panelCneos!.resumen.consultado)),
      });
    return nClonesCneos > 0
      ? t('desc.sistema-solar.cneos', { fecha, n: nClonesCneos })
      : t('desc.sistema-solar.cneos.sin', { fecha });
  }
  function descripcionVista(): string {
    if (modo === 'cneos' && panelCneos) return descripcionCneos();
    const p = piezaDe(panel.actual());
    if (p.id === 'chelyabinsk')
      return vista === 'tierra'
        ? t('desc.tierra', {
            fecha: formatoFecha(bolido.fecha),
            alt: bolido.alturaKm.toLocaleString('es'),
            lat: coord(bolido.latGrados, 'N', 'S'),
            lon: coord(bolido.lonGrados, 'E', 'O'),
          })
        : `${t('desc.sistema-solar', { fecha: formatoFecha(bolido.fecha), n: orbitas.clones.length })} ${descripcionRegiones()}`;
    const fecha = formatoFecha(new Date(impacto));
    const animada = trayPieza?.id === p.id;
    if (vista === 'tierra')
      return (
        t('desc.tierra.pieza', {
          fecha,
          nombre: nombrePieza(p),
          lat: p.punto ? coordenada(p.punto.lat, 'N', 'S') : '—',
          lon: p.punto ? coordenada(p.punto.lon, 'E', 'O') : '—',
          n: panel.visibles().size,
        }) +
        (animada ? ` ${t('desc.tierra.pieza.aprox', { alto: trayPieza!.punto.altura_km })}` : '')
      );
    if (animada)
      return `${t('desc.sistema-solar.pieza', {
        fecha,
        nombre: nombrePieza(p),
        n: solarCreada?.cat.nClonesSeleccion() ?? 0,
        fuente: p.orbita ? fuenteCorta(p.orbita.fuente) : '—',
        regiones: '',
      }).trimEnd()}${t('desc.sistema-solar.pieza.tray')} ${descripcionRegiones()}`;
    return t('desc.sistema-solar.pieza', {
      fecha,
      nombre: nombrePieza(p),
      n: solarCreada?.cat.nClonesSeleccion() ?? 0,
      fuente: p.orbita ? fuenteCorta(p.orbita.fuente) : '—',
      regiones: descripcionRegiones(),
    });
  }

  let urlPendiente = 0;
  function guardarUrl(): void {
    window.clearTimeout(urlPendiente);
    urlPendiente = window.setTimeout(() => {
      const q = escribirEstadoUrl({
        modo,
        pieza: panel.actual(),
        ...(modo === 'cneos' && panelCneos && { evento: panelCneos.actual() }),
        t: Math.round(reloj.estado().t / 1000) * 1000,
        vista,
        escalaVisual,
      });
      history.replaceState(null, '', q);
    }, 400);
  }

  /** El meteoroide y el marcador del bólido solo se dibujan para Chelyabinsk en modo pedigrí. */
  const conMeteoroide = () =>
    modo === 'pedigri' && (panel.actual() === 'chelyabinsk' || trayPieza?.id === panel.actual());
  function refrescarVista(): void {
    if (vista === 'sistema-solar') asegurarSolar();
    motor.activar(vista);
    for (const b of botonesVista) b.setAttribute('aria-pressed', String(b.dataset.vista === vista));
    interruptor.setAttribute('aria-checked', String(escalaVisual));
    tierra.aplicarEscala(escalaVisual);
    solarCreada?.solar.aplicarEscala(escalaVisual);
    avisoEscala.textContent = escalaVisual
      ? t(
          (vista === 'tierra'
            ? conMeteoroide()
              ? 'escala.visual.tierra'
              : 'escala.visual.tierra.pieza'
            : conMeteoroide()
              ? 'escala.visual.sistema-solar'
              : 'escala.visual.sistema-solar.sin-meteoroide') as Clave,
          {
            sol: EXAGERACION.sol,
            planetas: EXAGERACION.planetas,
            jupiter: EXAGERACION.jupiter,
          },
        )
      : t('escala.real');
    avisoMarcadores.hidden = vista !== 'tierra';
    avisoMarcadores.textContent = t(
      modo === 'cneos' ? 'escala.marcadores.cneos' : 'escala.marcadores',
    );
    if (!secuencia.activa()) descripcion.textContent = descripcionVista();
    guardarUrl();
  }

  // ---------- Selección de pieza ----------
  function aplicarPiezaSolar(): void {
    if (!solarCreada || modo === 'cneos') return;
    const p = piezaDe(panel.actual());
    const chely = p.id === 'chelyabinsk';
    const { solar } = solarCreada;
    solar.mostrarNubeChelyabinsk(chely);
    if (chely) solar.fijarTrayectoria(trayectoria.helio_ecl_au, bolido.fecha, radioMet);
    else if (trayPieza)
      solar.fijarTrayectoria(trayPieza.helio_ecl_au, new Date(trayPieza.instante_referencia));
    solar.mostrarTrayectoria(chely || trayPieza !== null);
    solarCreada.cat.seleccionar(p);
    solarCreada.etiquetaNube.element.textContent = t('etiqueta.nube', { nombre: nombrePieza(p) });
  }

  /** Ajusta escena, reloj y panel a la pieza seleccionada; `t` opcional (estado de la URL). */
  function aplicarPieza(id: string, tInicial?: number): void {
    if (secuencia.activa()) terminarSecuencia();
    const p = piezaDe(id);
    const chely = id === 'chelyabinsk';
    impacto = chely ? bolido.fecha.getTime() : Date.parse(p.fecha);
    trayPieza = null;
    pedidoTray++;
    if (chely && escenaConOtra) {
      // Vuelve a la trayectoria de Chelyabinsk (vector del CNEOS)
      tierra.fijarBolido({
        fecha: bolido.fecha,
        aproximacion: trayectoria.geo_eqj_km,
        punto: bolido,
        vEcefKmS: bolido.vEcefKmS,
        radioMeteoroideKm: radioMet,
      });
      escenaConOtra = false;
    }
    tierra.mostrarBolido(chely);
    if (!chely && indiceTray.has(id)) void cargarTrayectoriaPieza(id);
    marcadores.seleccionar(id);
    etiquetaCaida.element.textContent = t('etiqueta.caida', { nombre: nombrePieza(p) });
    aplicarPiezaSolar();
    reloj.fijarRango(impacto - 365 * DIA_MS, impacto, tInicial ?? impacto);
    // Sin trayectoria cargada aún, el recorrido se habilita al terminar la carga
    bRecorrido.disabled = !chely;
    notaRecorrido.hidden = chely || indiceTray.has(id);
    notaRecorrido.textContent = t('tiempo.sin-trayectoria');
    bFicha.hidden = !(chely && fichaDisponible);
    // La cámara terrestre apunta al bólido seleccionado (orientación del globo en ese instante)
    const dir = chely ? tierra.posicionBolido() : marcadores.posicionMundo(id);
    if (dir) {
      dirBolido = dir.normalize();
      if (vista === 'tierra') fijarCamara('tierra', encuadreTierra().pos, ORIGEN);
    }
    if (solarCreada) fijarCamara('sistema-solar', encuadreSolar().pos, ORIGEN);
    refrescarVista();
  }

  async function cargarTrayectoriaPieza(id: string): Promise<void> {
    const pedido = pedidoTray;
    let tr: TrayectoriaPieza;
    try {
      if (!cacheTray.has(id))
        cacheTray.set(id, cargarJson<TrayectoriaPieza>(`data/trayectorias/${id}.json`));
      tr = await cacheTray.get(id)!;
    } catch {
      cacheTray.delete(id);
      if (pedido === pedidoTray) descripcion.textContent = t('error.datos');
      return;
    }
    // Llegó tarde: se eligió otra pieza o se cambió de modo
    if (pedido !== pedidoTray || modo !== 'pedigri' || panel.actual() !== id) return;
    trayPieza = tr;
    escenaConOtra = true;
    tierra.fijarBolido({
      fecha: new Date(tr.instante_referencia),
      aproximacion: tr.geo_eqj_km,
      punto: { latGrados: tr.punto.lat, lonGrados: tr.punto.lon, alturaKm: tr.punto.altura_km },
    });
    tierra.mostrarBolido(true);
    aplicarPiezaSolar();
    bRecorrido.disabled = false;
    notaRecorrido.hidden = true;
    if (!secuencia.activa()) refrescarVista();
  }

  // ---------- Modo CNEOS ----------
  /** Capas de la vista solar según el modo (catálogo de pedigrí o nube del bólido CNEOS). */
  function aplicarModoSolar(): void {
    if (!solarCreada) return;
    const cneosActivo = modo === 'cneos';
    solarCreada.cat.grupo.visible = !cneosActivo;
    solarCreada.nubeCneos.grupo.visible = cneosActivo && nClonesCneos > 0;
    if (cneosActivo) solarCreada.solar.mostrarBolido(false);
    else aplicarPiezaSolar();
  }

  async function cargarNubeCneos(id: string): Promise<void> {
    const pedido = ++pedidoOrbita;
    const ev = panelCneos!.evento(id)!;
    nClonesCneos = 0;
    solarCreada?.nubeCneos.vaciar();
    aplicarModoSolar();
    if (!ev.orbita || 'error' in ev.orbita) return;
    try {
      const o = await cargarJson<OrbitaCneos>(`data/cneos/orbitas/${id}.json`);
      if (pedido !== pedidoOrbita || 'error' in o) return; // llegó tarde o sin nube
      nClonesCneos = o.clones.length;
      asegurarSolar().nubeCneos.fijar(o.clones, o.nominal);
      aplicarModoSolar();
      if (!secuencia.activa()) descripcion.textContent = descripcionVista();
    } catch {
      if (pedido === pedidoOrbita) descripcion.textContent = t('error.datos');
    }
  }

  function aplicarEvento(id: string, tInicial?: number): void {
    const ev = panelCneos?.evento(id);
    if (!ev || !bolidos) return;
    impacto = Date.parse(ev.fecha);
    bolidos.seleccionar(id);
    etiquetaBolido!.element.textContent = t('etiqueta.cneos', {
      fecha: new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(ev.fecha),
      ),
    });
    reloj.fijarRango(impacto - 365 * DIA_MS, impacto, tInicial ?? impacto);
    bRecorrido.disabled = true;
    notaRecorrido.hidden = false;
    notaRecorrido.textContent = t('tiempo.solo-chelyabinsk.cneos');
    bFicha.hidden = true;
    const dir = bolidos.posicionMundo(id);
    if (dir) {
      dirBolido = dir.normalize();
      if (vista === 'tierra') fijarCamara('tierra', encuadreTierra().pos, ORIGEN);
    }
    if (solarCreada) fijarCamara('sistema-solar', encuadreSolar().pos, ORIGEN);
    void cargarNubeCneos(id);
    refrescarVista();
  }

  async function cambiarModo(nuevo: Modo, tInicial?: number): Promise<void> {
    if (secuencia.activa()) terminarSecuencia();
    if (nuevo === 'pedigri') {
      modo = 'pedigri';
      bolidos?.mostrar(false);
      marcadores.malla.visible = true;
      aplicarModoSolar();
      aplicarPieza(panel.actual(), tInicial);
      return;
    }
    descripcion.textContent = t('cneos.cargando');
    let pc: PanelCneos;
    try {
      pc = await cneosCtl.asegurarCneos();
    } catch {
      descripcion.textContent = t('error.datos');
      return;
    }
    if (cneosCtl.modo.actual() !== 'cneos') return; // se volvió al otro modo mientras cargaba
    modo = 'cneos';
    if (!panelCneos) {
      panelCneos = pc;
      bolidos = crearBolidosTierra(tierra.globo, pc.resumen.eventos);
      etiquetaBolido = motor.etiqueta('', bolidos.resalte, 'seleccion');
      motor.activar(motor.activa()); // etiqueta nueva: visible solo en su vista
      bolidos.filtrar(pc.visibles());
      pc.alSeleccionar((id) => modo === 'cneos' && aplicarEvento(id));
      pc.alFiltrar((ids) => {
        bolidos!.filtrar(ids);
        if (modo === 'cneos' && !secuencia.activa()) descripcion.textContent = descripcionVista();
      });
    }
    bolidos!.mostrar(true);
    marcadores.malla.visible = false;
    marcadores.resalte.visible = false;
    tierra.mostrarBolido(false);
    aplicarModoSolar();
    aplicarEvento(pc.actual(), tInicial);
  }

  reloj.alCambiar((e) => {
    const f = new Date(e.t);
    tierra.actualizarTiempo(f);
    solarCreada?.solar.actualizarTiempo(f);
    deslizador.value = String(Math.round(((e.t - reloj.min) / (reloj.max - reloj.min)) * 10000));
    const texto = textoFecha(e.t);
    fechaTexto.textContent = texto;
    deslizador.setAttribute('aria-valuetext', texto);
    bReproducir.textContent = t(e.reproduciendo ? 'tiempo.pausar' : 'tiempo.reproducir');
    bReproducir.setAttribute('aria-pressed', String(e.reproduciendo));
    guardarUrl();
  });

  // ---------- Secuencia cinematográfica ----------
  const lerp = (a: Vector3, b: Vector3, p: number) => a.clone().lerp(b, p);
  const irDias = (d: number) => reloj.irA(impacto + d * DIA_MS);
  const narrar = (k: Clave) => (descripcion.textContent = t(k));
  const fundir = (opacidad: number) => (p: number) =>
    (fundido.style.opacity = String(opacidad === 1 ? p : 1 - p));
  let desde = encuadreTierra();
  // Cámara de seguimiento en la llegada: detrás y al costado del meteoroide, mirando a la Tierra
  const ARRIBA = new Vector3(0, 1, 0);
  const camaraSeguimiento = (): Vector3 => {
    const met = tierra.meteoroide.position.clone();
    const d = met.length();
    const lado = met
      .clone()
      .cross(ARRIBA)
      .normalize()
      .multiplyScalar(0.05 * d);
    return met.multiplyScalar(1.25).add(lado);
  };

  const pasos: Paso[] = [
    {
      duracion: 2.5,
      alEmpezar: () => {
        vista = 'tierra';
        refrescarVista();
        narrar('narr.alejar');
        irDias(0);
        desde = { pos: camT.camara.position.clone(), obj: camT.controles.target.clone() };
      },
      alAvanzar: (p) =>
        fijarCamara('tierra', lerp(desde.pos, dirBolido.clone().multiplyScalar(40), p), ORIGEN),
    },
    { duracion: 0.6, alAvanzar: fundir(1) },
    {
      duracion: 0.6,
      alEmpezar: () => {
        vista = 'sistema-solar';
        refrescarVista();
        narrar('narr.sistema');
        irDias(-365);
        fijarCamara('sistema-solar', encuadreSolar().pos, ORIGEN);
      },
      alAvanzar: fundir(0),
    },
    {
      duracion: 7,
      alAvanzar: (p) => {
        irDias(-365 + 362 * p);
        const ang = p * 0.7;
        const base = encuadreSolar().pos;
        fijarCamara('sistema-solar', base.applyAxisAngle(new Vector3(0, 1, 0), ang), ORIGEN);
      },
    },
    {
      duracion: 2.5,
      alEmpezar: () => {
        narrar('narr.acercar');
        desde = { pos: asegurarSolar().camS.camara.position.clone(), obj: ORIGEN.clone() };
      },
      alAvanzar: (p) => {
        irDias(-3 + 2 * p);
        const tierraPos = asegurarSolar().solar.posicionTierra();
        const destino = tierraPos.clone().add(new Vector3(0.06, 0.1, 0.12));
        fijarCamara('sistema-solar', lerp(desde.pos, destino, p), lerp(desde.obj, tierraPos, p));
      },
    },
    { duracion: 0.6, alAvanzar: fundir(1) },
    {
      duracion: 0.6,
      alEmpezar: () => {
        vista = 'tierra';
        refrescarVista();
        narrar('narr.llegada');
      },
      alAvanzar: fundir(0),
    },
    {
      duracion: 4.5,
      alAvanzar: (p) => {
        irDias(-1 * (1 - p) ** 2 - (20 / 1440) * p);
        fijarCamara('tierra', camaraSeguimiento(), ORIGEN);
      },
    },
    {
      duracion: 2,
      alEmpezar: () => (desde = { pos: camT.camara.position.clone(), obj: ORIGEN.clone() }),
      alAvanzar: (p) => {
        irDias((-20 / 1440) * (1 - p));
        fijarCamara('tierra', lerp(desde.pos, encuadreTierra().pos.multiplyScalar(0.7), p), ORIGEN);
      },
    },
  ];

  function terminarSecuencia(): void {
    secuencia.detener();
    fundido.style.opacity = '0';
    irDias(0);
    vista = 'tierra';
    fijarCamara('tierra', encuadreTierra().pos.multiplyScalar(0.7), ORIGEN);
    camT.controles.enabled = true;
    if (solarCreada) solarCreada.camS.controles.enabled = true;
    bSaltar.hidden = true;
    bRecorrido.disabled = false;
    solarCreada?.cat.filtrar(panel.visibles());
    refrescarVista();
    const p = piezaDe(panel.actual());
    descripcion.textContent =
      p.id === 'chelyabinsk'
        ? t('narr.final', { fecha: formatoFecha(bolido.fecha) })
        : t('narr.final.pieza', { nombre: nombrePieza(p), fecha: formatoFecha(new Date(impacto)) });
  }
  const secuencia = crearSecuencia(pasos, terminarSecuencia);

  function verRecorrido(): void {
    reloj.reproducir(false);
    if (movimientoReducido.matches) {
      // Sin transiciones largas: corte directo a la órbita completa
      vista = 'sistema-solar';
      irDias(0);
      fijarCamara('sistema-solar', encuadreSolar().pos, ORIGEN);
      refrescarVista();
      narrar('narr.reducido');
      return;
    }
    camT.controles.enabled = false;
    asegurarSolar().camS.controles.enabled = false;
    // Durante el recorrido solo se ve la nube de la pieza que se sigue
    asegurarSolar().cat.filtrar(new Set([panel.actual()]));
    bSaltar.hidden = false;
    bRecorrido.disabled = true;
    secuencia.iniciar();
  }

  motor.alCuadro((dt) => {
    if (secuencia.activa()) secuencia.avanzar(dt);
    else reloj.avanzar(dt);
  });

  // ---------- Eventos ----------
  for (const b of botonesVista)
    b.addEventListener('click', () => {
      if (secuencia.activa()) terminarSecuencia();
      vista = b.dataset.vista as NombreVista;
      refrescarVista();
    });
  interruptor.addEventListener('click', () => {
    escalaVisual = !escalaVisual;
    refrescarVista();
  });
  bRecorrido.addEventListener('click', verRecorrido);
  bSaltar.addEventListener('click', terminarSecuencia);
  bReproducir.addEventListener('click', () => {
    if (secuencia.activa()) terminarSecuencia();
    reloj.reproducir(!reloj.estado().reproduciendo);
  });
  bImpacto.addEventListener('click', () => {
    if (secuencia.activa()) terminarSecuencia();
    reloj.reproducir(false);
    irDias(0);
  });
  selVelocidad.addEventListener('change', () => reloj.fijarVelocidad(Number(selVelocidad.value)));
  deslizador.addEventListener('input', () => {
    if (secuencia.activa()) terminarSecuencia();
    reloj.irA(reloj.min + (Number(deslizador.value) / 10000) * (reloj.max - reloj.min));
  });
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const objetivo = ev.target as HTMLElement;
    // Solo se ceden las teclas que el propio control usa
    const enCampo = objetivo.closest('input, select, textarea') !== null;
    const enActivable = objetivo.closest('button, summary, a') !== null;
    if (ev.key === 'Escape') {
      if (secuencia.activa()) terminarSecuencia();
    } else if (ev.key === ' ') {
      if (enCampo || enActivable) return;
      ev.preventDefault();
      bReproducir.click();
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      if (enCampo) return;
      reloj.irA(reloj.estado().t + (ev.key === 'ArrowLeft' ? -DIA_MS : DIA_MS));
    } else if (ev.key.toLowerCase() === 'i' && !enCampo) bImpacto.click();
  });

  panel.alSeleccionar((id) => modo === 'pedigri' && aplicarPieza(id));
  panel.alFiltrar((ids) => {
    marcadores.filtrar(ids);
    solarCreada?.cat.filtrar(ids);
    if (!secuencia.activa()) descripcion.textContent = descripcionVista();
  });
  marcadores.filtrar(panel.visibles());
  aplicarPieza(panel.actual(), inicial.t);
  cneosCtl.modo.alCambiar((m) => void cambiarModo(m));
  // Índice de piezas con trayectoria animada (archivo pequeño; no retrasa la escena)
  void cargarJson<{ piezas: string[] }>('data/trayectorias/indice.json')
    .then((i) => {
      indiceTray = new Set(i.piezas);
      const id = panel.actual();
      if (modo === 'pedigri' && id !== 'chelyabinsk' && indiceTray.has(id)) {
        notaRecorrido.hidden = true;
        void cargarTrayectoriaPieza(id);
      }
    })
    .catch(() => undefined); // sin índice: solo Chelyabinsk tiene recorrido
  if (cneosCtl.modo.actual() === 'cneos') void cambiarModo('cneos', inicial.t);

  // Selección con el ratón: clic (sin arrastre) sobre un marcador del globo
  const rayo = new Raycaster();
  const ndc = new Vector2();
  function piezaBajoPuntero(ev: PointerEvent): string | undefined {
    if (vista !== 'tierra') return undefined;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, camT.camara);
    if (modo === 'cneos' && bolidos) {
      const [hitB] = rayo.intersectObject(bolidos.malla);
      return hitB?.instanceId !== undefined
        ? bolidos.eventoDeInstancia(hitB.instanceId)
        : undefined;
    }
    const [hit] = rayo.intersectObject(marcadores.malla);
    return hit?.instanceId !== undefined ? marcadores.piezaDeInstancia(hit.instanceId) : undefined;
  }
  let inicioPuntero: { x: number; y: number } | undefined;
  canvas.addEventListener(
    'pointerdown',
    (ev) => (inicioPuntero = { x: ev.clientX, y: ev.clientY }),
  );
  canvas.addEventListener('pointerup', (ev) => {
    const ini = inicioPuntero;
    inicioPuntero = undefined;
    if (!ini || Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) > 5) return;
    const id = piezaBajoPuntero(ev);
    if (!id) return;
    if (modo === 'cneos') {
      if (id !== panelCneos?.actual()) panelCneos?.seleccionar(id);
    } else if (id !== panel.actual()) panel.seleccionar(id);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.buttons) return;
    canvas.classList.toggle('apuntando', piezaBajoPuntero(ev) !== undefined);
  });

  // Marca de "listo": primera textura cargada y un cuadro dibujado (métrica de carga)
  void tierra.primeraCargada.then(() =>
    requestAnimationFrame(() => {
      (window as unknown as Record<string, unknown>).__listo = performance.now();
      // Con la Tierra ya visible, se prepara la vista solar en un momento de reposo
      const enReposo = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 300));
      enReposo(() => asegurarSolar());
    }),
  );

  // Expuesto para pruebas automáticas
  (window as unknown as Record<string, unknown>).__app = {
    motor,
    reloj,
    secuencia,
    panel,
    marcadores,
    camT,
    solar: () => solarCreada,
    cneos: () => ({ modo, panel: panelCneos, bolidos, nClones: nClonesCneos }),
  };
}
