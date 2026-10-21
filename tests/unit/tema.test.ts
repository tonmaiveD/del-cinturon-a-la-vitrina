import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { temaCss } from '../../pipeline/tema-css';
import { TEMA, variablesCss } from '../../src/tema';
import type { Catalogo } from '../../src/ui/catalogo';
import { capasLeyenda } from '../../src/ui/descripcion-escena';

const catalogo = JSON.parse(readFileSync('public/data/catalogo.json', 'utf8')) as Catalogo;
const pieza = (id: string) => catalogo.piezas.find((p) => p.id === id)!;

describe('tema visual de la marca (M35)', () => {
  it('cada variable CSS que usa la hoja de estilos está definida en el tema', () => {
    const usadas = new Set(
      [...readFileSync('src/ui/estilos.css', 'utf8').matchAll(/var\(--([a-z-]+)/g)].map(
        (m) => m[1],
      ),
    );
    const definidas = Object.keys(TEMA.interfaz);
    expect([...usadas].filter((v) => !definidas.includes(v!))).toEqual([]);
    // La hoja de estilos no repite los valores (una sola fuente)
    expect(readFileSync('src/ui/estilos.css', 'utf8')).not.toMatch(/--acento:/);
  });

  it('el plugin inyecta las variables en index.html antes de la hoja de estilos', () => {
    const plugin = temaCss();
    const t = plugin.transformIndexHtml as { handler: (h: string) => string };
    const html = t.handler(readFileSync('index.html', 'utf8'));
    expect(html).toContain(`<style id="tema">${variablesCss()}</style>`);
    expect(html.indexOf('id="tema"')).toBeLessThan(html.indexOf('estilos.css'));
    expect(variablesCss()).toContain(`--acento: ${TEMA.interfaz.acento};`);
  });

  it('la leyenda usa los mismos colores que la escena (la estela de una pieza es la estela)', () => {
    const colores = Object.values(TEMA.capas) as string[];
    for (const [id, tray] of [
      ['chelyabinsk', false],
      ['novato', true],
      ['novato', false],
    ] as const)
      for (const [color] of capasLeyenda({ modo: 'pedigri', pieza: pieza(id) }, tray))
        expect(colores).toContain(color);
    const estela = capasLeyenda({ modo: 'pedigri', pieza: pieza('novato') }, true).find(
      ([, c]) => c === 'capas.estela',
    );
    // Hasta el 2026-10-21 la leyenda pintaba esta estela con el color de la línea central
    expect(estela?.[0]).toBe(TEMA.capas.estela);
  });

  it('los módulos de la escena no escriben colores de capa a mano', () => {
    const dir = 'src/scene';
    const conColores = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && f !== 'cuerpos.ts') // colores de los planetas
      .filter((f) => {
        const s = readFileSync(`${dir}/${f}`, 'utf8');
        // Negro del espacio, blanco de luces y base de instancias, y el globo sin textura
        const literales = [...s.matchAll(/0x([0-9a-fA-F]{6})|'#([0-9a-fA-F]{3,6})'/g)]
          .map((m) => (m[1] ?? m[2])!.toLowerCase())
          .filter((c) => !['000000', 'ffffff', '29415e'].includes(c));
        return literales.length > 0;
      });
    expect(conColores).toEqual([]);
  });
});
