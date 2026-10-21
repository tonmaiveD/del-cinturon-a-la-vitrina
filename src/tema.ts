/**
 * Tema visual (M35): para adaptar la web a la marca de la tienda, se cambia solo este archivo.
 *
 * - `interfaz`: variables CSS de los paneles (las inyecta en `index.html` el plugin
 *   `pipeline/tema-css.ts`; en desarrollo, reiniciar `npm run dev` tras cambiarlas). La prueba de
 *   accesibilidad (axe, WCAG 2.1 AA) comprueba el contraste de la combinación elegida.
 * - `capas`: color de cada capa de la escena 3D; la leyenda los toma de aquí, así que lo dibujado
 *   y lo explicado no pueden diferir.
 * - `cneos`: colores de los grupos de bólidos del CNEOS (símbolos del globo y su leyenda).
 *
 * Las intensidades de brillo de la escena (colores HDR del bloom) y los colores de los planetas
 * no son de marca y siguen en sus módulos.
 */
export const TEMA = {
  interfaz: {
    fondo: '#000',
    texto: '#eef0f5',
    'texto-suave': '#b4bbcc',
    panel: 'rgba(12, 14, 20, 0.82)',
    superficie: '#0f1219',
    'superficie-alta': '#181b24',
    borde: 'rgba(255, 255, 255, 0.14)',
    acento: '#ffb25c',
    /** Texto sobre el color de acento (botones activos). */
    'texto-sobre-acento': '#1a1206',
    aviso: '#ffd59a',
    /** Contorno del foco del teclado. */
    foco: '#8ec5ff',
    enlace: '#9fd0ff',
    fuente: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  capas: {
    /** Nube de órbitas de Chelyabinsk (Popova et al.). */
    chelyabinsk: '#ff9a3c',
    /** Posiciones actuales de las órbitas de Chelyabinsk (puntos). */
    posiciones: '#ffb066',
    /** Línea central de Chelyabinsk (órbita con todas las cifras). */
    'linea-central': '#ffe2b8',
    /** Estela del año previo (Chelyabinsk y las piezas con recorrido). */
    estela: '#ffd08a',
    /** Nube de la pieza seleccionada. */
    seleccion: '#6fd3ff',
    /** Nubes de las demás piezas. */
    otras: '#8f9bd6',
    hungaria: '#9be7a8',
    phocaea: '#f0b6ff',
    resonancias: '#ffd36b',
    /** Nube del bólido del CNEOS seleccionado. */
    cneos: '#6fd3ff',
    /** Trayectoria de entrada en la atmósfera (vista terrestre). */
    entrada: '#ffc46b',
    /** Aproximación final del meteoroide (vista terrestre). */
    aproximacion: '#ff9a3c',
  },
  cneos: {
    'con-orbita': '#6fd3ff',
    'orbita-fallida': '#b58cff',
    'no-verificable': '#ffb25c',
    'sin-trayectoria': '#c8ccd8',
    'sin-ubicacion': '#7d8494',
    /** Trayectoria de entrada del bólido seleccionado. */
    entrada: '#ffe3b0',
  },
} as const;

export type CapaTema = keyof typeof TEMA.capas;

/** Bloque `:root { … }` con las variables CSS de la interfaz (`--fondo`, `--acento`…). */
export function variablesCss(): string {
  const decl = Object.entries(TEMA.interfaz).map(([k, v]) => `--${k}: ${v};`);
  return `:root { ${decl.join(' ')} }`;
}
