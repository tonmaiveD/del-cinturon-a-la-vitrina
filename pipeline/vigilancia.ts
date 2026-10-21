/**
 * Vigilancia de la web publicada (M17 y M16): falla, y GitHub avisa por correo, si la web no
 * responde, si los datos no son JSON válido o si la última consulta al CNEOS tiene más de 48 h.
 * Sin dependencias (Node 24 ejecuta TypeScript directamente), para correr sin `npm ci`.
 * Uso: `node pipeline/vigilancia.ts [url]` (por defecto, la web publicada).
 */
export const URL_PUBLICADA = 'https://tonmaived.github.io/del-cinturon-a-la-vitrina/';
/** Más que esto sin consultar el CNEOS es una falla del bot (corre a diario, con retrasos). */
export const MAX_HORAS_SIN_CONSULTA = 48;

export interface Comprobacion {
  nombre: string;
  ok: boolean;
  detalle: string;
}

export function edadHoras(iso: string, ahora = Date.now()): number {
  return (ahora - Date.parse(iso)) / 3_600_000;
}

export function comprobarConsulta(datos: unknown, ahora = Date.now()): Comprobacion {
  const c = datos as { consultado?: string };
  if (typeof c?.consultado !== 'string' || Number.isNaN(Date.parse(c.consultado)))
    return { nombre: 'última consulta al CNEOS', ok: false, detalle: 'sin fecha válida' };
  const h = edadHoras(c.consultado, ahora);
  return {
    nombre: 'última consulta al CNEOS',
    ok: h <= MAX_HORAS_SIN_CONSULTA,
    detalle: `${c.consultado} (hace ${h.toFixed(1)} h; máximo ${MAX_HORAS_SIN_CONSULTA} h)`,
  };
}

async function obtener(url: string): Promise<{ estado: number; texto: string }> {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: 'no-store' });
  return { estado: r.status, texto: await r.text() };
}

export async function vigilar(base = URL_PUBLICADA): Promise<Comprobacion[]> {
  const sinCache = `?v=${Date.now()}`;
  const resultados: Comprobacion[] = [];
  const json = async (nombre: string, ruta: string, validar: (d: unknown) => Comprobacion) => {
    try {
      const { estado, texto } = await obtener(`${base}${ruta}${sinCache}`);
      if (estado !== 200) return resultados.push({ nombre, ok: false, detalle: `HTTP ${estado}` });
      resultados.push(validar(JSON.parse(texto)));
    } catch (e) {
      resultados.push({ nombre, ok: false, detalle: (e as Error).message });
    }
  };
  try {
    const { estado, texto } = await obtener(`${base}${sinCache}`);
    resultados.push({
      nombre: 'portada',
      ok: estado === 200 && texto.includes('id="escena"'),
      detalle: `HTTP ${estado}`,
    });
  } catch (e) {
    resultados.push({ nombre: 'portada', ok: false, detalle: (e as Error).message });
  }
  await json('catálogo', 'data/catalogo.json', (d) => {
    const n = (d as { piezas?: unknown[] }).piezas?.length ?? 0;
    return { nombre: 'catálogo', ok: n > 0, detalle: `${n} piezas` };
  });
  await json('última consulta al CNEOS', 'data/cneos/consulta.json', (d) => comprobarConsulta(d));
  return resultados;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const resultados = await vigilar(process.argv[2]);
  for (const r of resultados) console.log(`${r.ok ? 'ok   ' : 'FALLA'} ${r.nombre}: ${r.detalle}`);
  if (resultados.some((r) => !r.ok)) process.exit(1);
}
