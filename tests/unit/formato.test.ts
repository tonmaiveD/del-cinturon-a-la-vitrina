import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { fijarIdioma } from '../../src/i18n';
import { fecha, fijo, numero } from '../../src/i18n/formato';

const archivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? archivos(p) : p.endsWith('.ts') ? [p] : [];
  });

describe('formato de números y fechas según el idioma activo (M38)', () => {
  afterEach(() => fijarIdioma('es'));

  it('en español usa coma decimal y fechas en español', () => {
    expect(fijo(19.16, 2)).toBe('19,16');
    expect(numero(0.00106, { maximumFractionDigits: 5 })).toBe('0,00106');
    expect(fecha(new Date('2013-02-15T03:20:19Z'), { dateStyle: 'long', timeZone: 'UTC' })).toBe(
      '15 de febrero de 2013',
    );
  });

  it('un idioma sin diccionario deja el español (no cambia el formato a medias)', () => {
    fijarIdioma('en');
    expect(fijo(19.16, 2)).toBe('19,16');
  });

  it('ningún archivo fuera de src/i18n fija el idioma al formatear', () => {
    const fijados = archivos('src')
      .filter((p) => !p.startsWith(join('src', 'i18n')))
      .filter((p) => /toLocale\w*String\(\s*['"]|Intl\.\w+\(\s*['"]/.test(readFileSync(p, 'utf8')));
    expect(fijados).toEqual([]);
  });
});
