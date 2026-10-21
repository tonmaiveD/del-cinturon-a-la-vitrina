import { describe, expect, it } from 'vitest';
import { comprobarConsulta, MAX_HORAS_SIN_CONSULTA } from '../../pipeline/vigilancia';

describe('vigilancia de la web publicada (M17)', () => {
  const ahora = Date.parse('2026-10-21T19:30:00Z');
  it('la última consulta al CNEOS vale si tiene hasta 48 h', () => {
    expect(comprobarConsulta({ consultado: '2026-10-21T07:45:00Z' }, ahora).ok).toBe(true);
    expect(comprobarConsulta({ consultado: '2026-10-19T19:30:00Z' }, ahora).ok).toBe(true);
    expect(MAX_HORAS_SIN_CONSULTA).toBe(48);
  });
  it('falla si pasaron más de 48 h o si no hay una fecha válida', () => {
    expect(comprobarConsulta({ consultado: '2026-10-19T19:00:00Z' }, ahora).ok).toBe(false);
    expect(comprobarConsulta({}, ahora).ok).toBe(false);
    expect(comprobarConsulta({ consultado: 'ayer' }, ahora).ok).toBe(false);
  });
});
