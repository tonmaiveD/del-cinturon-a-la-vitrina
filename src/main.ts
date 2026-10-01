import { Vector3 } from 'three';
import cneos from '../data/cneos/chelyabinsk.json';
import pedigri from '../data/pedigri/chelyabinsk.json';
import { crearSecuencia, type Paso } from './camera/coreografia';
import { t } from './i18n';
import { PLANETAS } from './scene/cuerpos';
import { crearMotor, type NombreVista } from './scene/escena';
import { crearVistaSistemaSolar, EXAGERACION, type DatosOrbitas } from './scene/sistema-solar';
import { crearVistaTierra, type DatosBolido } from './scene/tierra';
import type { Muestra } from './timeline/interpolacion';
import { crearReloj, VELOCIDADES } from './timeline/reloj';
import { escribirEstadoUrl, leerEstadoUrl } from './ui/estado-url';
import { aplicarTextos } from './ui/textos';

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

async function cargarJson<T>(ruta: string): Promise<T> {
  const r = await fetch(`${import.meta.env.BASE_URL}${ruta}`);
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.json() as Promise<T>;
}

async function iniciar(): Promise<void> {
  aplicarTextos();
  const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>('#escena');
  const descripcion = $('#descripcion');
  const bolido = registroCneos();
  const impacto = bolido.fecha.getTime();

  let orbitas: DatosOrbitas;
  let trayectoria: { helio_ecl_au: Muestra[]; geo_eqj_km: Muestra[] };
  try {
    [orbitas, trayectoria] = await Promise.all([
      cargarJson<DatosOrbitas>('data/chelyabinsk-orbitas.json'),
      cargarJson<typeof trayectoria>('data/chelyabinsk-trayectoria.json'),
    ]);
  } catch {
    descripcion.textContent = t('error.datos');
    return;
  }

  const motor = crearMotor(canvas, $('#etiquetas'));
  const movil = window.matchMedia('(max-width: 900px)').matches;
  const radioMet = radioMeteoroideKm();
  const tierra = crearVistaTierra(
    bolido,
    `${import.meta.env.BASE_URL}texturas/tierra-${movil ? 2048 : 4096}.jpg`,
    trayectoria.geo_eqj_km,
    radioMet,
  );
  const solar = crearVistaSistemaSolar(bolido.fecha, orbitas, trayectoria.helio_ecl_au, radioMet);

  const camT = motor.registrar('tierra', tierra.escena, 1e-4, 2e3, (cam) => tierra.actualizar(cam));
  const camS = motor.registrar('sistema-solar', solar.escena, 1e-6, 200);
  motor.etiqueta(t('etiqueta.bolido'), tierra.marcador, 'bolido');
  motor.etiqueta(t('etiqueta.meteoroide'), tierra.meteoroide, 'bolido');
  motor.etiqueta(t('etiqueta.sol'), solar.sol);
  motor.etiqueta(t('etiqueta.meteoroide'), solar.meteoroide, 'bolido');
  for (const p of PLANETAS)
    motor.etiqueta(t(`planeta.${p.clave}` as Clave), solar.mallas.get(p.clave)!);

  // Encuadres de referencia
  const aspecto = canvas.clientWidth / canvas.clientHeight;
  const dirBolido = tierra.posicionBolido().normalize();
  const medioFovH = Math.atan(Math.tan((camT.camara.fov * Math.PI) / 360) * Math.min(1, aspecto));
  const distTierra = Math.max(3.2, 1.25 / Math.sin(medioFovH));
  const ORIGEN = new Vector3();
  const encuadreTierra = () => ({
    pos: dirBolido.clone().multiplyScalar(distTierra),
    obj: ORIGEN.clone(),
  });
  const encuadreSolar = () => ({
    pos: new Vector3(0, 2.6, 2.2).multiplyScalar(aspecto < 0.8 ? 1.9 : 1),
    obj: ORIGEN.clone(),
  });
  function fijarCamara(vista: NombreVista, pos: Vector3, obj: Vector3): void {
    const c = vista === 'tierra' ? camT : camS;
    c.camara.position.copy(pos);
    c.controles.target.copy(obj);
    c.camara.lookAt(obj);
  }
  camT.controles.minDistance = 1.02;
  camT.controles.maxDistance = 400;
  camS.controles.maxDistance = 30;

  // Estado inicial (URL)
  const inicial = leerEstadoUrl(location.search, {
    pieza: 'chelyabinsk',
    t: impacto,
    vista: 'tierra',
    escalaVisual: true,
  });
  const reloj = crearReloj(impacto - 365 * DIA_MS, impacto, inicial.t ?? impacto);
  let vista: NombreVista = inicial.vista;
  let escalaVisual = inicial.escalaVisual;
  fijarCamara('tierra', encuadreTierra().pos, ORIGEN);
  fijarCamara('sistema-solar', encuadreSolar().pos, ORIGEN);

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
  for (const v of VELOCIDADES)
    selVelocidad.add(new Option(t(`velocidad.${v}` as Clave), String(v)));
  selVelocidad.value = String(reloj.estado().velocidad);

  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');

  function textoFecha(ms: number): string {
    const dias = (impacto - ms) / DIA_MS;
    const rel =
      dias < 1 / 1440
        ? t('tiempo.en-impacto')
        : t('tiempo.antes', {
            dias:
              dias >= 1
                ? `${dias.toLocaleString('es', { maximumFractionDigits: 1 })} d`
                : `${(dias * 24).toLocaleString('es', { maximumFractionDigits: 1 })} h`,
          });
    return t('tiempo.relativo', { fecha: formatoFecha(new Date(ms)), rel });
  }

  function descripcionVista(): string {
    return vista === 'tierra'
      ? t('desc.tierra', {
          fecha: formatoFecha(bolido.fecha),
          alt: bolido.alturaKm.toLocaleString('es'),
          lat: coord(bolido.latGrados, 'N', 'S'),
          lon: coord(bolido.lonGrados, 'E', 'O'),
        })
      : t('desc.sistema-solar', { fecha: formatoFecha(bolido.fecha), n: orbitas.clones.length });
  }

  let urlPendiente = 0;
  function guardarUrl(): void {
    window.clearTimeout(urlPendiente);
    urlPendiente = window.setTimeout(() => {
      const q = escribirEstadoUrl({
        pieza: 'chelyabinsk',
        t: Math.round(reloj.estado().t / 1000) * 1000,
        vista,
        escalaVisual,
      });
      history.replaceState(null, '', q);
    }, 400);
  }

  function refrescarVista(): void {
    motor.activar(vista);
    for (const b of botonesVista) b.setAttribute('aria-pressed', String(b.dataset.vista === vista));
    interruptor.setAttribute('aria-checked', String(escalaVisual));
    tierra.aplicarEscala(escalaVisual);
    solar.aplicarEscala(escalaVisual);
    avisoEscala.textContent = escalaVisual
      ? t(`escala.visual.${vista}` as Clave, {
          sol: EXAGERACION.sol,
          planetas: EXAGERACION.planetas,
          jupiter: EXAGERACION.jupiter,
        })
      : t('escala.real');
    if (!secuencia.activa()) descripcion.textContent = descripcionVista();
    guardarUrl();
  }

  reloj.alCambiar((e) => {
    const f = new Date(e.t);
    tierra.actualizarTiempo(f);
    solar.actualizarTiempo(f);
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
        desde = { pos: camS.camara.position.clone(), obj: ORIGEN.clone() };
      },
      alAvanzar: (p) => {
        irDias(-3 + 2 * p);
        const tierraPos = solar.posicionTierra();
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
    camS.controles.enabled = true;
    bSaltar.hidden = true;
    bRecorrido.disabled = false;
    refrescarVista();
    narrar('narr.final');
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
    camS.controles.enabled = false;
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

  reloj.irA(reloj.estado().t);
  refrescarVista();

  // Expuesto para pruebas automáticas
  (window as unknown as Record<string, unknown>).__app = { motor, reloj, secuencia };
}

void iniciar();
