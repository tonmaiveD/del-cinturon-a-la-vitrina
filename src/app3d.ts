import { Vector3 } from 'three';
import cneos from '../data/cneos/chelyabinsk.json';
import pedigri from '../data/pedigri/chelyabinsk.json';
import { crearSecuencia } from './camera/coreografia';
import { DURACIONES, pasosRecorrido } from './camera/recorrido';
import { t } from './i18n';
import { fecha as fechaLocal } from './i18n/formato';
import { idiomaDeUrl } from './i18n/idioma';
import { PLANETAS } from './scene/cuerpos';
import type { PanelCneos } from './cneos/panel';
import type { OrbitaCneos } from './cneos/resumen';
import { crearCatalogoSolar } from './scene/catalogo-solar';
import type { NubesPedigri } from './ui/catalogo';
import { crearBolidosTierra, type BolidosTierra } from './scene/cneos-tierra';
import { crearNubeCneos } from './scene/cneos-solar';
import { crearMarcadoresTierra } from './scene/catalogo-tierra';
import { crearMotor, type NombreVista } from './scene/escena';
import { crearVistaSistemaSolar, EXAGERACION, type DatosOrbitas } from './scene/sistema-solar';
import { conectarPuntero } from './scene/puntero';
import { crearVistaTierra, type DatosBolido } from './scene/tierra';
import type { Muestra } from './timeline/interpolacion';
import { crearReloj, VELOCIDADES } from './timeline/reloj';
import { escribirEstadoUrl, leerEstadoUrl, type Modo } from './ui/estado-url';
import type { ControlModo } from './ui/modo';
import { avisarError, quitarAviso } from './ui/avisos';
import {
  capasLeyenda,
  claveIrAlFinal,
  DIA_MS,
  descripcionVista as describir,
  nodosLeyenda,
  textoAvisoEscala,
  textoAvisoLuz,
  textoFecha as fechaRelativa,
  textoLlegada,
  type Clave,
  type EstadoDescrito,
} from './ui/descripcion-escena';
import { areaLibre, type ControlHoja } from './ui/hoja';
import { nombrePieza, type PanelPieza } from './ui/panel-pieza';
import { conectarAtajos, conectarCamara } from './ui/teclado';
import { crearCargaTrayectorias, type TrayectoriaPieza } from './ui/trayectorias';

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

export interface DatosEscena {
  orbitas: DatosOrbitas;
  /** Trayectoria de Chelyabinsk desde la órbita de Popova; dt = 0 en `instante_referencia`. */
  trayectoria: { instante_referencia: string; helio_ecl_au: Muestra[]; geo_eqj_km: Muestra[] };
}

import { cargarJson, urlTextura } from './ui/recursos';

/** Arranca la parte 3D (se carga con import() dinámico desde main.ts). */
export async function iniciar3D(
  datosPromesa: Promise<DatosEscena>,
  panelPromesa: Promise<PanelPieza>,
  cneosCtl: { modo: ControlModo; asegurarCneos: () => Promise<PanelCneos>; hoja: ControlHoja },
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
    avisarError('inicio', t('error.inicio'), () => location.reload());
    return;
  }

  const motor = crearMotor(canvas, $('#etiquetas'));
  // La cámara se centra en la zona que no tapa la hoja de paneles (móvil) y sigue sus cambios
  motor.fijarAreaLibre(areaLibre);
  new ResizeObserver(() => motor.ajustar()).observe($('#hoja'));
  const movil = window.matchMedia('(max-width: 900px)').matches;
  const radioMet = radioMeteoroideKm();
  /** Instante de la última muestra de la trayectoria de Chelyabinsk (no es el pico del CNEOS). */
  const refTrayectoria = new Date(trayectoria.instante_referencia);
  const tierra = crearVistaTierra(
    bolido,
    [urlTextura(1024), urlTextura(movil ? 2048 : 4096)],
    { muestras: trayectoria.geo_eqj_km, referencia: refTrayectoria },
    radioMet,
    (reintentar) => avisarError('textura', t('error.textura'), reintentar),
  );
  motor.alContexto((perdido) =>
    perdido ? avisarError('contexto', t('error.contexto')) : quitarAviso('contexto'),
  );
  const camT = motor.registrar('tierra', tierra.escena, 1e-4, 2e3, (cam) => tierra.actualizar(cam));
  // El marcador del final: pico de brillo del CNEOS (Chelyabinsk) o final de la aproximación
  const etiquetaFinal = motor.etiqueta(t('etiqueta.bolido'), tierra.marcador, 'bolido');
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
    luzPresentacion: true,
  });
  const reloj = crearReloj(impacto - 365 * DIA_MS, impacto, inicial.t ?? impacto);
  let vista: NombreVista = inicial.vista;
  /** Modo de la escena: meteoritos con pedigrí o bólidos del CNEOS (se activa al cargar sus datos). */
  let modo: Modo = 'pedigri';
  let panelCneos: PanelCneos | undefined;
  let bolidos: BolidosTierra | undefined;
  let etiquetaBolido: ReturnType<typeof motor.etiqueta> | undefined;
  // Trayectorias animadas de las piezas con pedigrí
  let indiceTray = new Set<string>();
  const cargarTrayectoria = crearCargaTrayectorias();
  /** Trayectoria de la pieza seleccionada (no Chelyabinsk), ya cargada. */
  let trayPieza: TrayectoriaPieza | null = null;
  /** La escena tiene cargada una trayectoria distinta de la de Chelyabinsk. */
  let escenaConOtra = false;
  let pedidoTray = 0;
  /** Clones dibujados en la nube del bólido seleccionado (para la descripción). */
  let nClonesCneos = 0;
  let pedidoOrbita = 0;
  let escalaVisual = inicial.escalaVisual;
  let luzPresentacion = inicial.luzPresentacion ?? true;
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
    const solar = crearVistaSistemaSolar(
      bolido.fecha,
      orbitas,
      trayectoria.helio_ecl_au,
      radioMet,
      refTrayectoria,
    );
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
    void cargarNubes();
    aplicarPiezaSolar();
    if (modo === 'cneos') aplicarModoSolar();
    cat.filtrar(panel.visibles());
    solarCreada?.solar.aplicarEscala(escalaVisual);
    solar.actualizarTiempo(new Date(reloj.estado().t));
    fijarCamara('sistema-solar', encuadreSolar().pos, ORIGEN);
    motor.activar(motor.activa()); // oculta las etiquetas nuevas si la vista no está activa
    return solarCreada;
  }

  /** Nubes de las piezas (precalculadas desde su radiante): se piden al crear la vista solar. */
  async function cargarNubes(): Promise<void> {
    try {
      const n = await cargarJson<NubesPedigri>('data/nubes.json');
      quitarAviso('nubes');
      // Solo cambia la parte de la descripción que habla de la escena: se conserva la narración
      // que la precede (llegada, movimiento reducido)
      const antes = descripcionVista();
      solarCreada!.cat.fijarNubes(n);
      const texto = descripcion.textContent ?? '';
      if (!secuencia.activa() && texto.endsWith(antes))
        descripcion.textContent = texto.slice(0, texto.length - antes.length) + descripcionVista();
    } catch {
      avisarError('nubes', t('error.nubes'), () => void cargarNubes());
    }
  }

  // Controles del panel
  const avisoEscala = $('#aviso-escala');
  const interruptor = $<HTMLButtonElement>('#escala');
  const bLuz = $<HTMLButtonElement>('#iluminacion');
  const avisoLuz = $('#aviso-iluminacion');
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

  /** Instantánea del estado para los textos de la escena (src/ui/descripcion-escena.ts). */
  const estadoDescrito = (): EstadoDescrito => ({
    modo,
    vista,
    luzPresentacion,
    impacto,
    catalogo,
    pieza: piezaDe(panel.actual()),
    nVisibles: panel.visibles().size,
    bolido,
    nOrbitasChelyabinsk: orbitas.clones.length,
    trayPieza,
    nClonesSeleccion: solarCreada?.cat.nClonesSeleccion() ?? 0,
    metodoNube: solarCreada?.cat.metodoNube(panel.actual()),
    ...(modo === 'cneos' &&
      panelCneos && {
        cneos: {
          evento: panelCneos.evento(panelCneos.actual())!,
          nVisibles: panelCneos.visibles().size,
          consultado: panelCneos.resumen.consultado,
          nClones: nClonesCneos,
        },
      }),
  });
  const descripcionVista = () => describir(estadoDescrito());
  const textoFecha = (ms: number) => fechaRelativa(ms, estadoDescrito());

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
        luzPresentacion,
        idioma: idiomaDeUrl(),
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
    bLuz.setAttribute('aria-checked', String(luzPresentacion));
    tierra.fijarIluminacion(luzPresentacion);
    // La luz de presentación solo afecta al globo: en la vista solar ilumina el Sol real
    avisoLuz.hidden = vista !== 'tierra';
    avisoLuz.textContent = textoAvisoLuz(luzPresentacion);
    tierra.aplicarEscala(escalaVisual);
    solarCreada?.solar.aplicarEscala(escalaVisual);
    avisoEscala.textContent = textoAvisoEscala(escalaVisual, vista, conMeteoroide(), EXAGERACION);
    avisoMarcadores.hidden = vista !== 'tierra';
    avisoMarcadores.textContent = t(
      modo === 'cneos' ? 'escala.marcadores.cneos' : 'escala.marcadores',
    );
    // El final del recorrido es el pico de brillo (Chelyabinsk y CNEOS) o el punto de referencia
    bImpacto.textContent = t(claveIrAlFinal(estadoDescrito()));
    if (!secuencia.activa()) descripcion.textContent = descripcionVista();
    actualizarLeyendaCapas();
    // Nombre de lo seleccionado en la cabecera de la hoja móvil
    cneosCtl.hoja.fijarTitulo(
      modo === 'cneos'
        ? (etiquetaBolido?.element.textContent ?? '')
        : ($<HTMLSelectElement>('#pieza').selectedOptions[0]?.text ?? ''),
    );
    guardarUrl();
  }

  // ---------- Selección de pieza ----------
  function aplicarPiezaSolar(): void {
    if (!solarCreada || modo === 'cneos') return;
    const p = piezaDe(panel.actual());
    const chely = p.id === 'chelyabinsk';
    const { solar } = solarCreada;
    solar.mostrarNubeChelyabinsk(chely);
    if (chely) solar.fijarTrayectoria(trayectoria.helio_ecl_au, refTrayectoria, radioMet);
    else if (trayPieza)
      solar.fijarTrayectoria(trayPieza.helio_ecl_au, new Date(trayPieza.instante_referencia));
    solar.mostrarTrayectoria(chely || trayPieza !== null);
    solarCreada.cat.seleccionar(p);
    solarCreada.etiquetaNube.element.textContent = t('etiqueta.nube', { nombre: nombrePieza(p) });
  }

  // Leyenda por capa de la vista solar (M27)
  const leyendaCapas = $('#leyenda-capas');
  const listaCapas = $('#leyenda-capas-lista');
  function actualizarLeyendaCapas(): void {
    leyendaCapas.hidden = vista !== 'sistema-solar';
    if (leyendaCapas.hidden) return;
    listaCapas.replaceChildren(...nodosLeyenda(capasLeyenda(estadoDescrito(), trayPieza !== null)));
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
      // Vuelve a Chelyabinsk: aproximación desde la órbita de Popova, entrada del CNEOS
      tierra.fijarBolido({
        fecha: bolido.fecha,
        fechaAproximacion: refTrayectoria,
        aproximacion: trayectoria.geo_eqj_km,
        punto: bolido,
        vEcefKmS: bolido.vEcefKmS,
        radioMeteoroideKm: radioMet,
      });
      escenaConOtra = false;
    }
    tierra.mostrarBolido(chely);
    etiquetaFinal.element.textContent = t(chely ? 'etiqueta.bolido' : 'etiqueta.bolido.pieza');
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
      tr = await cargarTrayectoria(id);
    } catch {
      if (pedido === pedidoTray)
        avisarError('trayectoria', t('error.trayectoria'), () => void cargarTrayectoriaPieza(id));
      return;
    }
    quitarAviso('trayectoria');
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
      quitarAviso('orbita');
      nClonesCneos = o.clones.length;
      asegurarSolar().nubeCneos.fijar(o.clones, o.nominal);
      aplicarModoSolar();
      if (!secuencia.activa()) descripcion.textContent = descripcionVista();
    } catch {
      if (pedido === pedidoOrbita)
        avisarError('orbita', t('error.orbita'), () => void cargarNubeCneos(id));
    }
  }

  function aplicarEvento(id: string, tInicial?: number): void {
    const ev = panelCneos?.evento(id);
    if (!ev || !bolidos) return;
    impacto = Date.parse(ev.fecha);
    bolidos.seleccionar(id);
    etiquetaBolido!.element.textContent = t('etiqueta.cneos', {
      fecha: fechaLocal(new Date(ev.fecha), { dateStyle: 'medium', timeZone: 'UTC' }),
    });
    reloj.fijarRango(impacto - 365 * DIA_MS, impacto, tInicial ?? impacto);
    bRecorrido.disabled = true;
    notaRecorrido.hidden = false;
    notaRecorrido.textContent = t('tiempo.sin-recorrido.cneos');
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
      // El modo de pedigrí sigue funcionando; el reintento vuelve a pedir los datos
      if (cneosCtl.modo.actual() === 'cneos')
        avisarError('cneos', t('error.cneos'), () => void cambiarModo('cneos', tInicial));
      descripcion.textContent = t('error.datos');
      return;
    }
    quitarAviso('cneos');
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
  const irDias = (d: number) => reloj.irA(impacto + d * DIA_MS);
  const pasos = pasosRecorrido({
    irDias,
    narrar: (k: Clave) => (descripcion.textContent = t(k)),
    irAVista: (v) => {
      vista = v;
      refrescarVista();
    },
    fijarCamara,
    fundido: (o) => (fundido.style.opacity = String(o)),
    encuadreTierra,
    encuadreSolar,
    posicionCamara: (v) => (v === 'tierra' ? camT : asegurarSolar().camS).camara.position,
    dirBolido: () => dirBolido,
    posicionTierraSolar: () => asegurarSolar().solar.posicionTierra(),
    posicionMeteoroide: () => tierra.meteoroide.position,
  });

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
    // El mensaje de llegada se antepone: la descripción del método y sus límites no desaparecen
    descripcion.textContent = `${textoLlegada(estadoDescrito())} ${descripcionVista()}`;
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
      descripcion.textContent = `${t('narr.reducido')} ${descripcionVista()}`;
      return;
    }
    // En el móvil la hoja se baja para ver la animación
    if (cneosCtl.hoja.activa()) cneosCtl.hoja.fijarAltura('compacta');
    camT.controles.enabled = false;
    asegurarSolar().camS.controles.enabled = false;
    // Durante el recorrido solo se ve la nube de la pieza que se sigue
    asegurarSolar().cat.filtrar(new Set([panel.actual()]));
    bSaltar.hidden = false;
    bRecorrido.disabled = true;
    tiempoRecorrido = 0;
    secuencia.iniciar();
  }

  // Duración del recorrido (DURACIONES): independiente de la velocidad de «Reproducir», que
  // avanza el reloj de la simulación.
  const duracionBase = pasos.reduce((s, p) => s + p.duracion, 0);
  const selDuracion = $<HTMLSelectElement>('#duracion-recorrido');
  for (const d of DURACIONES)
    selDuracion.add(
      new Option(
        t(`duracion.${d.clave}` as Clave, { s: Math.round(duracionBase * d.factor) }),
        String(d.factor),
      ),
    );
  selDuracion.value = '1';
  /** Segundos de escena transcurridos en el último recorrido (en un equipo fluido, segundos reales). */
  let tiempoRecorrido = 0;
  motor.alCuadro((dt) => {
    if (secuencia.activa()) {
      tiempoRecorrido += dt;
      secuencia.avanzar(dt / Number(selDuracion.value));
    } else reloj.avanzar(dt);
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
  bLuz.addEventListener('click', () => {
    luzPresentacion = !luzPresentacion;
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
  // Cámara sin arrastrar (M04) y atajos de teclado
  conectarCamara(canvas, {
    antes: () => secuencia.activa() && terminarSecuencia(),
    controles: () => (vista === 'tierra' ? camT : asegurarSolar().camS).controles,
    restablecer: () =>
      fijarCamara(vista, (vista === 'tierra' ? encuadreTierra() : encuadreSolar()).pos, ORIGEN),
  });
  conectarAtajos({
    escape: () => secuencia.activa() && terminarSecuencia(),
    reproducir: () => bReproducir.click(),
    moverDia: (signo) => reloj.irA(reloj.estado().t + signo * DIA_MS),
    irAlFinal: () => bImpacto.click(),
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
  const cargarIndiceTray = () =>
    cargarJson<{ piezas: string[] }>('data/trayectorias/indice.json')
      .then((i) => {
        quitarAviso('indice');
        indiceTray = new Set(i.piezas);
        const id = panel.actual();
        if (modo === 'pedigri' && id !== 'chelyabinsk' && indiceTray.has(id)) {
          notaRecorrido.hidden = true;
          void cargarTrayectoriaPieza(id);
        }
      })
      // Sin índice solo Chelyabinsk tiene recorrido: se avisa y se puede reintentar
      .catch(() => avisarError('indice', t('error.indice'), () => void cargarIndiceTray()));
  void cargarIndiceTray();
  if (cneosCtl.modo.actual() === 'cneos') void cambiarModo('cneos', inicial.t);

  // Selección con el ratón o el dedo sobre un marcador del globo
  conectarPuntero(canvas, {
    camara: () => camT.camara,
    seleccionables: () => {
      if (vista !== 'tierra') return undefined;
      if (modo === 'cneos')
        return (
          bolidos && { malla: bolidos.malla, idDeInstancia: (k) => bolidos!.eventoDeInstancia(k) }
        );
      return { malla: marcadores.malla, idDeInstancia: (k) => marcadores.piezaDeInstancia(k) };
    },
    alArrastrar: () => {
      // Girar el globo con el dedo baja la hoja móvil, como al mover un mapa
      const hoja = cneosCtl.hoja;
      if (hoja.activa() && hoja.altura() !== 'compacta') hoja.fijarAltura('compacta');
    },
    alSeleccionar: (id) => {
      // Tocar un marcador abre su ficha en la hoja móvil
      const hoja = cneosCtl.hoja;
      if (hoja.activa()) {
        hoja.mostrarPestana('explorar');
        if (hoja.altura() === 'compacta') hoja.fijarAltura('media');
      }
      if (modo === 'cneos') {
        if (id !== panelCneos?.actual()) panelCneos?.seleccionar(id);
      } else if (id !== panel.actual()) panel.seleccionar(id);
    },
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
    tierra,
    solar: () => solarCreada,
    tiempoRecorrido: () => tiempoRecorrido,
    cneos: () => ({ modo, panel: panelCneos, bolidos, nClones: nClonesCneos }),
  };
}
