import { Vector3 } from 'three';
import cneos from '../data/cneos/chelyabinsk.json';
import { t } from './i18n';
import { crearMotor, type NombreVista } from './scene/escena';
import { crearVistaSistemaSolar, EXAGERACION, type DatosOrbitas } from './scene/sistema-solar';
import { crearVistaTierra, type DatosBolido } from './scene/tierra';
import { PLANETAS } from './scene/cuerpos';
import { aplicarTextos } from './ui/textos';

type Clave = Parameters<typeof t>[0];

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

const formatoFecha = (d: Date) =>
  new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(
    d,
  );
const coord = (v: number, pos: string, neg: string) =>
  `${Math.abs(v).toLocaleString('es', { maximumFractionDigits: 1 })}° ${v >= 0 ? pos : neg}`;

async function iniciar(): Promise<void> {
  aplicarTextos();
  const canvas = document.querySelector<HTMLCanvasElement>('#escena')!;
  const motor = crearMotor(canvas, document.querySelector<HTMLElement>('#etiquetas')!);
  const bolido = registroCneos();

  const movil = window.matchMedia('(max-width: 900px)').matches;
  const base = import.meta.env.BASE_URL;
  const tierra = crearVistaTierra(bolido, `${base}texturas/tierra-${movil ? 2048 : 4096}.jpg`);
  const camT = motor.registrar('tierra', tierra.escena, 1e-4, 1e3, (cam) => tierra.actualizar(cam));
  const pB = tierra.posicionBolido();
  // Distancia para que el globo quepa también en pantallas verticales
  const aspecto = canvas.clientWidth / canvas.clientHeight;
  const medioFovH = Math.atan(Math.tan((camT.camara.fov * Math.PI) / 360) * Math.min(1, aspecto));
  camT.camara.position.copy(
    pB
      .clone()
      .normalize()
      .multiplyScalar(Math.max(3.2, 1.25 / Math.sin(medioFovH))),
  );
  camT.controles.minDistance = 1.05;
  camT.controles.maxDistance = 50;
  motor.etiqueta(t('etiqueta.bolido'), pB, tierra.escena, 'bolido');

  const descripcion = document.querySelector<HTMLElement>('#descripcion')!;
  const avisoEscala = document.querySelector<HTMLElement>('#aviso-escala')!;
  const interruptor = document.querySelector<HTMLButtonElement>('#escala')!;
  const botones = [...document.querySelectorAll<HTMLButtonElement>('[data-vista]')];

  let orbitas: DatosOrbitas;
  try {
    const r = await fetch(`${base}data/chelyabinsk-orbitas.json`);
    if (!r.ok) throw new Error(String(r.status));
    orbitas = await r.json();
  } catch {
    descripcion.textContent = t('error.datos');
    return;
  }
  const solar = crearVistaSistemaSolar(bolido.fecha, orbitas);
  const camS = motor.registrar('sistema-solar', solar.escena, 1e-6, 200);
  camS.camara.position.set(0, 2.6, 2.2).multiplyScalar(aspecto < 0.8 ? 1.9 : 1);
  camS.controles.target.set(0, 0, 0);
  camS.controles.maxDistance = 30;
  motor.etiqueta(t('etiqueta.sol'), new Vector3(0, 0, 0), solar.escena);
  for (const p of PLANETAS)
    motor.etiqueta(
      t(`planeta.${p.clave}` as Clave),
      solar.mallas.get(p.clave)!.position,
      solar.escena,
    );

  let vista: NombreVista = 'tierra';
  let escalaVisual = true;

  function refrescar(): void {
    motor.activar(vista);
    for (const b of botones) b.setAttribute('aria-pressed', String(b.dataset.vista === vista));
    interruptor.setAttribute('aria-checked', String(escalaVisual));
    tierra.aplicarEscala(escalaVisual);
    solar.aplicarEscala(escalaVisual);
    avisoEscala.textContent = escalaVisual
      ? t(`escala.visual.${vista}` as Clave, {
          sol: EXAGERACION.sol,
          planetas: EXAGERACION.planetas,
        })
      : t('escala.real');
    descripcion.textContent =
      vista === 'tierra'
        ? t('desc.tierra', {
            fecha: formatoFecha(bolido.fecha),
            alt: bolido.alturaKm.toLocaleString('es'),
            lat: coord(bolido.latGrados, 'N', 'S'),
            lon: coord(bolido.lonGrados, 'E', 'O'),
          })
        : t('desc.sistema-solar', { fecha: formatoFecha(bolido.fecha), n: orbitas.clones.length });
  }
  for (const b of botones)
    b.addEventListener('click', () => {
      vista = b.dataset.vista as NombreVista;
      refrescar();
    });
  interruptor.addEventListener('click', () => {
    escalaVisual = !escalaVisual;
    refrescar();
  });
  refrescar();

  // Expuesto para pruebas automáticas de rendimiento
  (window as unknown as { __motor: typeof motor }).__motor = motor;
}

void iniciar();
