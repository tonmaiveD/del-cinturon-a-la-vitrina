/**
 * Contrato de entrada de la API Fireball (M08). Se comprueba en la frontera de descarga, antes
 * de guardar nada ni calcular órbitas: si la respuesta trae algo incompatible, la descarga falla
 * con el motivo exacto y se conserva el último conjunto válido.
 *
 * - Errores: versión no admitida, campos ausentes, recuento incoherente, filas incompletas,
 *   fechas inválidas o repetidas, números ilegibles, coordenadas o velocidades imposibles, y
 *   cambios masivos frente a la última descarga (cuarentena).
 * - Advertencias: rarezas de la propia fuente que no impiden usar los datos, como un vector de
 *   velocidad cuyo módulo no coincide con la velocidad publicada.
 */

/** Versiones de la API revisadas. Una nueva exige revisar el formato antes de aceptarla. */
export const VERSIONES_ADMITIDAS = ['1.2'];
export const CAMPOS = [
  'date',
  'energy',
  'impact-e',
  'lat',
  'lat-dir',
  'lon',
  'lon-dir',
  'alt',
  'vel',
  'vx',
  'vy',
  'vz',
] as const;
/** Cuarentena: eventos de la descarga anterior que pueden desaparecer sin detener nada. */
export const MAX_DESAPARECIDOS = 5;
/** Diferencia (km/s) entre |v| y la velocidad publicada a partir de la cual se advierte. */
export const UMBRAL_INCOHERENCIA_V = 0.5;

export interface RespuestaCruda {
  signature: { source: string; version: string };
  count: string | number;
  fields: string[];
  data: (string | null)[][];
}

export interface ResultadoContrato {
  errores: string[];
  advertencias: string[];
}

const FECHA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function validarRespuesta(
  r: RespuestaCruda,
  anterior?: RespuestaCruda,
  ahora = new Date(),
): ResultadoContrato {
  const errores: string[] = [];
  const advertencias: string[] = [];
  if (!VERSIONES_ADMITIDAS.includes(r.signature?.version))
    errores.push(`versión de la API no admitida: ${r.signature?.version}`);
  const faltan = CAMPOS.filter((c) => !r.fields?.includes(c));
  if (faltan.length) errores.push(`faltan campos: ${faltan.join(', ')}`);
  if (!Array.isArray(r.data)) return { errores: [...errores, 'sin datos'], advertencias };
  if (Number(r.count) !== r.data.length)
    errores.push(`el recuento (${r.count}) no coincide con las filas (${r.data.length})`);
  if (faltan.length) return { errores, advertencias };

  const ix = new Map(r.fields.map((k, i) => [k, i]));
  const fechas = new Set<string>();
  let incoherentes = 0;
  r.data.forEach((fila, n) => {
    const donde = `fila ${n + 1}`;
    if (fila.length !== r.fields.length) {
      errores.push(`${donde}: ${fila.length} valores para ${r.fields.length} campos`);
      return;
    }
    const c = (k: (typeof CAMPOS)[number]) => fila[ix.get(k)!] ?? null;
    const numero = (k: (typeof CAMPOS)[number]): number | null | undefined => {
      const v = c(k);
      if (v === null) return null;
      const x = Number(v);
      if (v.trim() === '' || !Number.isFinite(x)) {
        errores.push(`${donde}: ${k} no es un número (${JSON.stringify(v)})`);
        return undefined;
      }
      return x;
    };
    const fecha = c('date');
    if (!fecha || !FECHA.test(fecha) || Number.isNaN(Date.parse(`${fecha.replace(' ', 'T')}Z`)))
      errores.push(`${donde}: fecha inválida (${JSON.stringify(fecha)})`);
    else {
      if (fechas.has(fecha)) errores.push(`${donde}: fecha repetida ${fecha}`);
      fechas.add(fecha);
      if (Date.parse(`${fecha.replace(' ', 'T')}Z`) > ahora.getTime() + 86_400_000)
        errores.push(`${donde}: fecha futura ${fecha}`);
    }
    for (const k of ['energy', 'impact-e'] as const) {
      const x = numero(k);
      if (x === null || (x !== undefined && !(x > 0)))
        errores.push(`${donde}: ${k} ausente o no positivo`);
    }
    // Ubicación: las cuatro columnas juntas, en rangos válidos
    const ubic = [c('lat'), c('lat-dir'), c('lon'), c('lon-dir')];
    if (ubic.some((x) => x === null) && !ubic.every((x) => x === null))
      errores.push(`${donde}: ubicación incompleta`);
    else if (ubic[0] !== null) {
      const lat = numero('lat');
      const lon = numero('lon');
      if (lat != null && !(lat >= 0 && lat <= 90)) errores.push(`${donde}: latitud ${lat}`);
      if (lon != null && !(lon >= 0 && lon <= 180)) errores.push(`${donde}: longitud ${lon}`);
      if (!['N', 'S'].includes(ubic[1]!)) errores.push(`${donde}: lat-dir ${ubic[1]}`);
      if (!['E', 'W'].includes(ubic[3]!)) errores.push(`${donde}: lon-dir ${ubic[3]}`);
    }
    const alt = numero('alt');
    if (alt != null && !(alt > 0 && alt <= 200)) errores.push(`${donde}: altura ${alt} km`);
    const vel = numero('vel');
    if (vel != null && !(vel > 0 && vel <= 100)) errores.push(`${donde}: velocidad ${vel} km/s`);
    const v = [numero('vx'), numero('vy'), numero('vz')];
    if (v.some((x) => x === null) && !v.every((x) => x === null))
      errores.push(`${donde}: vector de velocidad incompleto`);
    else if (v.every((x) => typeof x === 'number')) {
      const modulo = Math.hypot(...(v as number[]));
      if (!(modulo > 0 && modulo <= 100)) errores.push(`${donde}: |v| = ${modulo} km/s`);
      if (vel != null && Math.abs(modulo - vel) > UMBRAL_INCOHERENCIA_V) incoherentes++;
    }
  });
  if (incoherentes)
    advertencias.push(
      `${incoherentes} eventos con |v| distinto de la velocidad publicada en más de ${UMBRAL_INCOHERENCIA_V} km/s (dato de la fuente; las órbitas usan el vector)`,
    );

  // Cuarentena: una revisión masiva de la fuente se revisa a mano antes de aceptarla
  if (anterior && Array.isArray(anterior.data)) {
    const iDate = anterior.fields.indexOf('date');
    const desaparecidos = anterior.data.filter((f) => !fechas.has(String(f[iDate]))).length;
    if (desaparecidos > MAX_DESAPARECIDOS)
      errores.push(
        `cuarentena: ${desaparecidos} eventos de la descarga anterior ya no están (máximo ${MAX_DESAPARECIDOS}); revisar a mano`,
      );
  }
  return { errores, advertencias };
}
