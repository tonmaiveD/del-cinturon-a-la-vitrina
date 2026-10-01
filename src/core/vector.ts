/** Álgebra mínima de vectores 3D como tuplas (rápidas y serializables). */
export type Vec3 = [number, number, number];

export const suma = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const resta = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const escala = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const punto = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cruz = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norma = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const unitario = (a: Vec3): Vec3 => escala(a, 1 / norma(a));

/** Matriz 3×3 por filas. */
export type Mat3 = [Vec3, Vec3, Vec3];

export const aplicar = (m: Mat3, v: Vec3): Vec3 => [punto(m[0], v), punto(m[1], v), punto(m[2], v)];

/** Rotación activa de ángulo θ (rad) alrededor del eje z. */
export const rotacionZ = (theta: number): Mat3 => {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
};

export const GRAD = Math.PI / 180;

/** Normaliza un ángulo a [0, 2π). */
export const angulo0a2pi = (x: number): number => {
  const r = x % (2 * Math.PI);
  return r < 0 ? r + 2 * Math.PI : r;
};
