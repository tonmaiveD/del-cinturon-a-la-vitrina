/**
 * Fichas narrativas: plantillas Markdown con marcadores {{clave}} que se rellenan solo con
 * valores verificados del dataset. El texto de la plantilla no puede contener cifras propias.
 */
export interface DatoFicha {
  texto: string;
  fuente: string;
}
export type ContextoFicha = Record<string, DatoFicha>;

export interface Ficha {
  pieza: string;
  estado: 'borrador' | 'aprobada';
  revisadoPor?: string;
  fechaRevision?: string;
  cuerpo: string;
}

export function leerFicha(md: string): Ficha {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(md);
  if (!m) throw new Error('ficha sin cabecera');
  const cab = Object.fromEntries(
    m[1]!.split('\n').map((l) => {
      const i = l.indexOf(':');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  if (cab.estado !== 'borrador' && cab.estado !== 'aprobada')
    throw new Error(`estado inválido: ${cab.estado}`);
  if (cab.estado === 'aprobada' && (!cab.revisado_por || !cab.fecha_revision))
    throw new Error('una ficha aprobada exige revisado_por y fecha_revision');
  return {
    pieza: cab.pieza!,
    estado: cab.estado,
    revisadoPor: cab.revisado_por || undefined,
    fechaRevision: cab.fecha_revision || undefined,
    cuerpo: m[2]!.trim(),
  };
}

/** Cifras escritas a mano fuera de marcadores (lo que el test de rigor prohíbe). */
export function cifrasFueraDeMarcadores(cuerpo: string): string[] {
  return cuerpo.replace(/\{\{[^}]+\}\}/g, '').match(/\d+/g) ?? [];
}

export const marcadores = (cuerpo: string): string[] =>
  [...cuerpo.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]!);

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Renderiza a HTML (subconjunto de Markdown: ## títulos, párrafos, **negrita**, *cursiva*). */
export function renderizarFicha(
  ficha: Ficha,
  ctx: ContextoFicha,
): { html: string; fuentes: string[] } {
  const usadas = new Set<string>();
  const conDatos = ficha.cuerpo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, clave: string) => {
    const d = ctx[clave];
    if (!d) throw new Error(`marcador sin dato verificado: ${clave}`);
    usadas.add(d.fuente);
    return d.texto;
  });
  const html = conDatos
    .split(/\n{2,}/)
    .map((bloque) => {
      const b = escapar(bloque.trim())
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      return b.startsWith('## ') ? `<h3>${b.slice(3)}</h3>` : `<p>${b}</p>`;
    })
    .join('\n');
  return { html, fuentes: [...usadas] };
}

/** En producción solo se publican fichas aprobadas. */
export const publicable = (f: Ficha, desarrollo: boolean) => f.estado === 'aprobada' || desarrollo;
