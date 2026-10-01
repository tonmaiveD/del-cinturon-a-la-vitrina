/** Generador pseudoaleatorio determinista (mulberry32) con normales por Box–Muller. */
export function crearAzar(semilla: number) {
  let s = semilla >>> 0;
  const uniforme = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (): number => {
    let u = 0;
    while (u === 0) u = uniforme();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * uniforme());
  };
  return { uniforme, normal };
}
