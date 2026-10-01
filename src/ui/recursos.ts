/** Rutas de recursos estáticos y precarga temprana (sin depender de Three.js). */
const BASE = import.meta.env.BASE_URL;

export const urlTextura = (ancho: number) => `${BASE}texturas/tierra-${ancho}.webp`;

async function cargarJson<T>(ruta: string): Promise<T> {
  const r = await fetch(`${BASE}${ruta}`);
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.json() as Promise<T>;
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
