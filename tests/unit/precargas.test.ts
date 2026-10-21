import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATOS_INICIALES, TEXTURA_INICIAL } from '../../pipeline/precargas';

describe('precargas del HTML (M15)', () => {
  it('coinciden con lo que pide la página al arrancar (si no, se descargaría dos veces)', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    for (const d of DATOS_INICIALES) expect(main, d).toContain(`'${d}'`);
    const recursos = readFileSync('src/ui/recursos.ts', 'utf8');
    expect(recursos).toContain('urlTextura(1024)');
    expect(TEXTURA_INICIAL).toBe('texturas/tierra-1024.webp');
    // Mismo modo CORS que el TextureLoader de Three
    expect(recursos).toContain("img.crossOrigin = 'anonymous'");
  });
});
