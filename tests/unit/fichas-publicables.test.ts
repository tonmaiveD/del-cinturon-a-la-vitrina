import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { leerFichasCrudas, seleccionarFichas } from '../../pipeline/fichas-publicables';
import { fichaDe, leerFicha } from '../../src/ui/ficha';
import { borradoresEnDist, testigos } from '../../pipeline/verificar-dist';

const cuerpo =
  'Una frase testigo bastante larga para la comprobación de borradores, sin cifras.\n\nOtra frase.';
const borrador = `---\npieza: x\nestado: borrador\nrevisado_por:\nfecha_revision:\n---\n${cuerpo}`;
const aprobada = `---\npieza: y\nestado: aprobada\nrevisado_por: Revisor\nfecha_revision: 2026-10-09\n---\nTexto aprobado.`;

describe('fichas publicables (M01)', () => {
  it('en producción solo entran las aprobadas; en desarrollo, todas', () => {
    const crudas = { 'x.md': borrador, 'y.md': aprobada };
    expect(Object.keys(seleccionarFichas(crudas, false))).toEqual(['y.md']);
    expect(Object.keys(seleccionarFichas(crudas, true))).toEqual(['x.md', 'y.md']);
  });

  it('el diálogo encuentra cada ficha con las claves del módulo virtual', () => {
    // Entre el 2026-10-09 y el 2026-10-12 el diálogo buscaba «…/chelyabinsk.md» y no la hallaba
    const crudas = seleccionarFichas(leerFichasCrudas(), true);
    for (const archivo of Object.keys(crudas)) {
      const pieza = archivo.replace(/\.md$/, '');
      expect(leerFicha(fichaDe(crudas, pieza)!).pieza, archivo).toBe(pieza);
    }
    expect(fichaDe(seleccionarFichas({ 'y.md': aprobada }, false), 'y')).toBe(aprobada);
  });

  it('detecta un borrador distribuido en dist, también en mapas de fuentes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dist-'));
    writeFileSync(join(dir, 'a.js'), 'console.log(1)');
    expect(borradoresEnDist(dir, { 'x.md': borrador, 'y.md': aprobada })).toEqual([]);
    writeFileSync(join(dir, 'a.js.map'), JSON.stringify({ sourcesContent: [cuerpo] }));
    expect(borradoresEnDist(dir, { 'x.md': borrador })).toHaveLength(1);
  });

  it('extrae fragmentos testigo literales de la plantilla', () => {
    expect(testigos(cuerpo)).toHaveLength(1);
  });
});
