import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cargaInicial, evaluar, type Presupuesto } from '../../pipeline/presupuestos';

const dist = () => {
  const d = mkdtempSync(join(tmpdir(), 'dist-'));
  mkdirSync(join(d, 'assets'));
  writeFileSync(
    join(d, 'index.html'),
    '<script type="module" src="/base/assets/index-a.js"></script><link rel="modulepreload" href="/base/assets/f-b.js"><link rel="stylesheet" href="/base/assets/index-c.css">',
  );
  for (const f of ['index-a.js', 'f-b.js', 'index-c.css']) writeFileSync(join(d, 'assets', f), 'x');
  return d;
};

describe('presupuestos de tamaño del build (M22)', () => {
  it('la carga inicial es el HTML y lo que enlaza, aunque haya prefijo de ruta (Pages)', () => {
    expect(cargaInicial(dist())).toEqual([
      'index.html',
      'assets/index-a.js',
      'assets/f-b.js',
      'assets/index-c.css',
    ]);
  });

  it('falla si un grupo supera su presupuesto o si no encuentra qué medir', () => {
    const d = dist();
    // Contenido incompresible de unos 6 kB
    writeFileSync(
      join(d, 'assets', 'grande.js'),
      Buffer.from(Array.from({ length: 6000 }, () => Math.floor(Math.random() * 256))),
    );
    const p = (limiteKb: number, archivos: string[]): Presupuesto => ({
      nombre: 'prueba',
      limiteKb,
      archivos: () => archivos,
      motivo: 'prueba',
    });
    expect(evaluar(d, [p(10, ['assets/grande.js'])]).errores).toEqual([]);
    expect(evaluar(d, [p(2, ['assets/grande.js'])]).errores.join()).toMatch(
      /supera el presupuesto de 2 kB/,
    );
    expect(evaluar(d, [p(2, ['assets/no-existe.js'])]).errores.join()).toMatch(/ningún archivo/);
  });
});
