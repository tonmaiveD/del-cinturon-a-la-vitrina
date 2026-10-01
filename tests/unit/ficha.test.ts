import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Meteorito } from '../../src/schema';
import {
  cifrasFueraDeMarcadores,
  leerFicha,
  marcadores,
  publicable,
  renderizarFicha,
} from '../../src/ui/ficha';
import { contextoFicha } from '../../src/ui/ficha-datos';

const fichas = readdirSync('content/fichas')
  .filter((f) => f.endsWith('.md'))
  .map((f) => leerFicha(readFileSync(`content/fichas/${f}`, 'utf8')));

describe.each(fichas.map((f) => [f.pieza, f] as const))('ficha %s', (pieza, ficha) => {
  const m = Meteorito.parse(JSON.parse(readFileSync(`data/pedigri/${pieza}.json`, 'utf8')));
  const cneos = JSON.parse(readFileSync(`data/cneos/${pieza}.json`, 'utf8'));
  const ctx = contextoFicha(m, cneos, 300);

  it('no contiene cifras escritas a mano fuera de los marcadores', () => {
    expect(cifrasFueraDeMarcadores(ficha.cuerpo)).toEqual([]);
  });
  it('todos los marcadores se resuelven con datos verificados', () => {
    for (const k of marcadores(ficha.cuerpo)) expect(ctx[k], k).toBeDefined();
    const { html, fuentes } = renderizarFicha(ficha, ctx);
    expect(html).not.toContain('{{');
    expect(fuentes.length).toBeGreaterThan(0);
  });
});

describe('reglas de publicación', () => {
  const base = `---\npieza: x\nestado: borrador\nrevisado_por:\nfecha_revision:\n---\nTexto.`;
  it('un borrador no se publica en producción', () => {
    expect(publicable(leerFicha(base), false)).toBe(false);
    expect(publicable(leerFicha(base), true)).toBe(true);
  });
  it('una ficha aprobada exige revisor y fecha', () => {
    expect(() => leerFicha(base.replace('borrador', 'aprobada'))).toThrow(/revisado_por/);
  });
  it('un marcador sin dato hace fallar el render', () => {
    expect(() => renderizarFicha(leerFicha(base.replace('Texto.', '{{nada}}')), {})).toThrow(
      /nada/,
    );
  });
  it('escapa HTML', () => {
    const { html } = renderizarFicha(leerFicha(base.replace('Texto.', '<script>')), {});
    expect(html).toBe('<p>&lt;script&gt;</p>');
  });
});
