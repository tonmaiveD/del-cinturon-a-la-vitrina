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
