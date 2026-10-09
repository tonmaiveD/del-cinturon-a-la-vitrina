/** Rutas de recursos estáticos y precarga temprana (sin depender de Three.js). */
const BASE = import.meta.env.BASE_URL;

export const urlTextura = (ancho: number) => `${BASE}texturas/tierra-${ancho}.webp`;

/** Tiempo máximo de una descarga de datos (ms): una red colgada no deja la carga pendiente. */
const TIEMPO_MAXIMO_MS = 30_000;

export async function cargarJson<T>(ruta: string): Promise<T> {
  const r = await fetch(`${BASE}${ruta}`, { signal: AbortSignal.timeout?.(TIEMPO_MAXIMO_MS) });
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  const datos: unknown = await r.json(); // lanza si el JSON es inválido
  if (typeof datos !== 'object' || datos === null) throw new Error(`${ruta}: no es un objeto`);
  return datos as T;
}

/**
 * Se llama al arrancar, en paralelo con la descarga del módulo 3D: pide los datos y la textura
 * inicial (que queda en la caché del navegador para el TextureLoader).
 */
export function precargar<T>(rutas: { orbitas: string; trayectoria: string }) {
  // Mismo modo CORS que el TextureLoader de Three, para que reutilice la entrada de caché
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = urlTextura(1024);
  return Promise.all([cargarJson(rutas.orbitas), cargarJson(rutas.trayectoria)]).then(
    ([orbitas, trayectoria]) => ({ orbitas, trayectoria }) as T,
  );
}
