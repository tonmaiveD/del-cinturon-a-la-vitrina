/** Idiomas publicables además del español (ver pipeline/idiomas-publicables.ts). */
declare module 'virtual:idiomas' {
  const cargadores: Record<
    string,
    () => Promise<{
      interfaz: Record<string, string>;
      datos: Record<string, { es: string; en?: string }>;
    }>
  >;
  export default cargadores;
}

/** Idiomas de un build de revisión local (`IDIOMAS_VISTA_PREVIA`); vacío en producción. */
declare const __VISTA_PREVIA__: string;

/** Versión publicada (vite.config.ts): commit corto y fecha ISO del build. */
declare const __VERSION__: { commit: string; fecha: string };
