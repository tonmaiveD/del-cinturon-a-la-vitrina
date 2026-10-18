import { describe, expect, it } from 'vitest';
import {
  GM_TIERRA_KM3_S2,
  instanteMaximaAproximacion,
  parametroImpacto,
  radioCaptura,
} from '../../src/core/encuentro';

describe('encuentro con la Tierra (aproximación de dos cuerpos)', () => {
  it('parámetro de impacto e instante de máxima aproximación de una recta', () => {
    expect(parametroImpacto([1, 0, 0], [0, 2, 0])).toBeCloseTo(1, 12);
    expect(parametroImpacto([3, 4, 0], [-1, 0, 0])).toBeCloseTo(4, 12);
    expect(parametroImpacto([5, 0, 0], [-1, 0, 0])).toBeCloseTo(0, 12);
    expect(instanteMaximaAproximacion([5, 0, 0], [-2, 0, 0])).toBeCloseTo(2.5, 12);
  });

  it('radio de captura: crece al bajar la velocidad y tiende al radio a velocidad alta', () => {
    expect(radioCaptura(1e6, 6471)).toBeCloseTo(6471, 3);
    expect(radioCaptura(10)).toBeGreaterThan(radioCaptura(20));
    // Chelyabinsk (v_g = 15,3 km/s, Popova et al.): unos 7994 km con 100 km de atmósfera
    expect(radioCaptura(15.3)).toBeCloseTo(7994, 0);
    // Definición: r·√(1 + 2GM/(r·v²))
    const r = 6471;
    expect(radioCaptura(15.3, r)).toBeCloseTo(
      r * Math.sqrt(1 + (2 * GM_TIERRA_KM3_S2) / r / 15.3 ** 2),
      9,
    );
  });
});
