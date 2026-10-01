/**
 * Motor mínimo de secuencias: lista de pasos con duración (s) y una función de progreso
 * (0..1, ya suavizado). Determinista: el avance depende solo del tiempo acumulado.
 */
export const suavizar = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;

export interface Paso {
  duracion: number;
  /** Se llama una vez al empezar el paso. */
  alEmpezar?: () => void;
  /** Progreso suavizado 0..1. */
  alAvanzar?: (p: number) => void;
}

export function crearSecuencia(pasos: Paso[], alTerminar?: () => void) {
  let i = -1;
  let tPaso = 0;
  let activa = false;

  function entrar(k: number): void {
    i = k;
    tPaso = 0;
    pasos[k]?.alEmpezar?.();
  }

  return {
    activa: () => activa,
    pasoActual: () => i,
    iniciar(): void {
      activa = true;
      entrar(0);
    },
    detener(): void {
      activa = false;
    },
    /** Avanza `dt` segundos; devuelve false cuando la secuencia terminó. */
    avanzar(dt: number): boolean {
      if (!activa) return false;
      let resto = dt;
      while (activa && resto >= 0) {
        const paso = pasos[i]!;
        const disponible = paso.duracion - tPaso;
        const usado = Math.min(resto, disponible);
        tPaso += usado;
        resto -= usado;
        paso.alAvanzar?.(suavizar(paso.duracion > 0 ? tPaso / paso.duracion : 1));
        if (tPaso >= paso.duracion) {
          if (i + 1 >= pasos.length) {
            activa = false;
            alTerminar?.();
            return false;
          }
          entrar(i + 1);
          if (resto === 0) break;
        } else break;
      }
      return activa;
    },
  };
}
