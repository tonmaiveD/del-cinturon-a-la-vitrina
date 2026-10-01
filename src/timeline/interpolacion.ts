/** Interpolación lineal en una serie temporal [t, x, y, z] ordenada por t. */
export type Muestra = [number, number, number, number];

export function indiceInferior(serie: Muestra[], t: number): number {
  let lo = 0;
  let hi = serie.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (serie[mid]![0] <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Posición interpolada; fuera del rango devuelve el extremo más cercano. */
export function interpolar(serie: Muestra[], t: number): [number, number, number] {
  const primero = serie[0]!;
  const ultimo = serie[serie.length - 1]!;
  if (t <= primero[0]) return [primero[1], primero[2], primero[3]];
  if (t >= ultimo[0]) return [ultimo[1], ultimo[2], ultimo[3]];
  const i = indiceInferior(serie, t);
  const a = serie[i]!;
  const b = serie[i + 1]!;
  const f = (t - a[0]) / (b[0] - a[0]);
  return [a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2]), a[3] + f * (b[3] - a[3])];
}
