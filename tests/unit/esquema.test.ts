import { describe, expect, it } from 'vitest';
import { Valor } from '../../src/schema';

const base = { valor: 1, fuente: 'f', estado: 'verificado' as const };

describe('Valor: niveles de incertidumbre', () => {
  it('acepta σ publicada a 2σ convertida a 1σ', () => {
    expect(
      Valor.safeParse({ ...base, sigma: 0.08, sigma_publicada: 0.16, nivel_sigma: '2-sigma' })
        .success,
    ).toBe(true);
  });
  it('rechaza una conversión incorrecta', () => {
    expect(
      Valor.safeParse({ ...base, sigma: 0.16, sigma_publicada: 0.16, nivel_sigma: '2-sigma' })
        .success,
    ).toBe(false);
  });
  it('exige nivel_sigma si hay sigma_publicada', () => {
    expect(Valor.safeParse({ ...base, sigma: 0.16, sigma_publicada: 0.16 }).success).toBe(false);
  });
});
