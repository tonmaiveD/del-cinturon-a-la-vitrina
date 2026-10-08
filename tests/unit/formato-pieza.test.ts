import { describe, expect, it } from 'vitest';
import { conSigma } from '../../src/ui/panel-pieza';

describe('valor ± σ sin precisión ficticia', () => {
  it('recorta los decimales que exceden la incertidumbre (JPL)', () => {
    expect(conSigma({ v: 1.265298465826829, s: 7.4156e-6 }, ' AU')).toBe(
      '1,2652985 ± 0,0000074 AU',
    );
  });
  it('nunca añade cifras a los valores publicados', () => {
    expect(conSigma({ v: 2.102, s: 0.0088 })).toBe('2,102 ± 0,0088');
    expect(conSigma({ v: 1.76, s: 0.08 })).toBe('1,76 ± 0,08');
    expect(conSigma({ v: 4.93 })).toBe('4,93');
  });
});
