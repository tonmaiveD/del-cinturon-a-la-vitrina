/** Reloj de simulación: tiempo simulado (ms UTC) que avanza a `velocidad` × tiempo real. */
export const VELOCIDADES = [1, 60, 3600, 86400, 864000, 1e6] as const;

export interface EstadoReloj {
  t: number;
  reproduciendo: boolean;
  velocidad: number;
}

export function crearReloj(min: number, max: number, inicial: number) {
  const fijar = (x: number) => Math.min(max, Math.max(min, x));
  const estado: EstadoReloj = { t: fijar(inicial), reproduciendo: false, velocidad: 86400 };
  const oyentes = new Set<(e: EstadoReloj) => void>();
  const emitir = () => oyentes.forEach((f) => f(estado));

  return {
    get min() {
      return min;
    },
    get max() {
      return max;
    },
    /** Cambia el intervalo (al seleccionar otra pieza) y sitúa el reloj en `t`. */
    fijarRango(nuevoMin: number, nuevoMax: number, t: number): void {
      min = nuevoMin;
      max = nuevoMax;
      estado.t = fijar(t);
      estado.reproduciendo = false;
      emitir();
    },
    estado: (): Readonly<EstadoReloj> => estado,
    /** Avanza `dtReal` segundos reales. Se detiene al llegar al final. */
    avanzar(dtReal: number): void {
      if (!estado.reproduciendo) return;
      estado.t = fijar(estado.t + dtReal * estado.velocidad * 1000);
      if (estado.t >= max) estado.reproduciendo = false;
      emitir();
    },
    irA(t: number): void {
      estado.t = fijar(t);
      emitir();
    },
    reproducir(si: boolean): void {
      if (si && estado.t >= max) estado.t = min;
      estado.reproduciendo = si;
      emitir();
    },
    fijarVelocidad(v: number): void {
      estado.velocidad = v;
      emitir();
    },
    alCambiar(f: (e: EstadoReloj) => void): () => void {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
  };
}
export type Reloj = ReturnType<typeof crearReloj>;
