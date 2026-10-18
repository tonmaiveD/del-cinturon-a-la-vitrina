/**
 * Coreografía del recorrido cinematográfico: alejarse de la Tierra, recorrer el último año en
 * la vista solar, acercarse a la Tierra y seguir la llegada del meteoroide. Cada paso usa el
 * contexto de la escena; la secuencia la ejecuta `crearSecuencia` (coreografia.ts).
 */
import { Vector3 } from 'three';
import type { NombreVista } from '../scene/escena';
import type { Clave } from '../ui/descripcion-escena';
import type { Paso } from './coreografia';

interface Encuadre {
  pos: Vector3;
  obj: Vector3;
}

/** Lo que el recorrido necesita de la escena (lo aporta app3d.ts). */
export interface ContextoRecorrido {
  /** Mueve el reloj a `d` días del instante de referencia. */
  irDias(d: number): void;
  narrar(clave: Clave): void;
  /** Cambia de vista y refresca panel y textos. */
  irAVista(vista: NombreVista): void;
  fijarCamara(vista: NombreVista, pos: Vector3, obj: Vector3): void;
  /** Opacidad (0–1) de la capa negra del fundido entre vistas. */
  fundido(opacidad: number): void;
  encuadreTierra(): Encuadre;
  encuadreSolar(): Encuadre;
  /** Posición actual de la cámara de cada vista. */
  posicionCamara(vista: NombreVista): Vector3;
  /** Dirección (EQJ) del bólido seleccionado desde el centro de la Tierra. */
  dirBolido(): Vector3;
  /** Posición de la Tierra en la vista solar. */
  posicionTierraSolar(): Vector3;
  /** Posición del meteoroide en la vista terrestre. */
  posicionMeteoroide(): Vector3;
}

/** Duración del recorrido: escala el tiempo de la animación sin cambiar su coreografía. */
export const DURACIONES = [
  { clave: 'corto', factor: 0.5 },
  { clave: 'normal', factor: 1 },
  { clave: 'largo', factor: 2 },
  { clave: 'muy-largo', factor: 4 },
] as const;

const ORIGEN = new Vector3();
const ARRIBA = new Vector3(0, 1, 0);
const lerp = (a: Vector3, b: Vector3, p: number) => a.clone().lerp(b, p);

export function pasosRecorrido(c: ContextoRecorrido): Paso[] {
  let desde: Encuadre = c.encuadreTierra();
  const fundir = (opacidad: number) => (p: number) => c.fundido(opacidad === 1 ? p : 1 - p);
  // Cámara de seguimiento en la llegada: detrás y al costado del meteoroide, mirando a la Tierra
  const camaraSeguimiento = (): Vector3 => {
    const met = c.posicionMeteoroide().clone();
    const d = met.length();
    const lado = met
      .clone()
      .cross(ARRIBA)
      .normalize()
      .multiplyScalar(0.05 * d);
    return met.multiplyScalar(1.25).add(lado);
  };

  return [
    {
      duracion: 2.5,
      alEmpezar: () => {
        c.irAVista('tierra');
        c.narrar('narr.alejar');
        c.irDias(0);
        desde = { pos: c.posicionCamara('tierra').clone(), obj: c.encuadreTierra().obj };
      },
      alAvanzar: (p) =>
        c.fijarCamara(
          'tierra',
          lerp(desde.pos, c.dirBolido().clone().multiplyScalar(40), p),
          ORIGEN,
        ),
    },
    { duracion: 0.6, alAvanzar: fundir(1) },
    {
      duracion: 0.6,
      alEmpezar: () => {
        c.irAVista('sistema-solar');
        c.narrar('narr.sistema');
        c.irDias(-365);
        c.fijarCamara('sistema-solar', c.encuadreSolar().pos, ORIGEN);
      },
      alAvanzar: fundir(0),
    },
    {
      duracion: 7,
      alAvanzar: (p) => {
        c.irDias(-365 + 362 * p);
        const ang = p * 0.7;
        const base = c.encuadreSolar().pos;
        c.fijarCamara('sistema-solar', base.applyAxisAngle(new Vector3(0, 1, 0), ang), ORIGEN);
      },
    },
    {
      duracion: 2.5,
      alEmpezar: () => {
        c.narrar('narr.acercar');
        desde = { pos: c.posicionCamara('sistema-solar').clone(), obj: ORIGEN.clone() };
      },
      alAvanzar: (p) => {
        c.irDias(-3 + 2 * p);
        const tierraPos = c.posicionTierraSolar();
        const destino = tierraPos.clone().add(new Vector3(0.06, 0.1, 0.12));
        c.fijarCamara('sistema-solar', lerp(desde.pos, destino, p), lerp(desde.obj, tierraPos, p));
      },
    },
    { duracion: 0.6, alAvanzar: fundir(1) },
    {
      duracion: 0.6,
      alEmpezar: () => {
        c.irAVista('tierra');
        c.narrar('narr.llegada');
      },
      alAvanzar: fundir(0),
    },
    {
      duracion: 4.5,
      alAvanzar: (p) => {
        c.irDias(-1 * (1 - p) ** 2 - (20 / 1440) * p);
        c.fijarCamara('tierra', camaraSeguimiento(), ORIGEN);
      },
    },
    {
      duracion: 2,
      alEmpezar: () => (desde = { pos: c.posicionCamara('tierra').clone(), obj: ORIGEN.clone() }),
      alAvanzar: (p) => {
        c.irDias((-20 / 1440) * (1 - p));
        c.fijarCamara(
          'tierra',
          lerp(desde.pos, c.encuadreTierra().pos.multiplyScalar(0.7), p),
          ORIGEN,
        );
      },
    },
  ];
}
