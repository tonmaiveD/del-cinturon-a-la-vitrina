/** Consistencia interna del dataset real: detecta errores de transcripción. */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Meteorito, type Valor } from '../../src/schema';

const dir = 'data/pedigri';
const meteoritos = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => Meteorito.parse(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))));

const num = (v: Valor) => v.valor as number;
const sig = (v: Valor) => v.sigma ?? 0;

describe.each(meteoritos.map((m) => [m.id, m] as const))('%s', (_id, m) => {
  it.each(m.orbitas.map((o) => [o.fuente, o] as const))(
    'órbita de %s: q y Q coherentes con a y e (3σ)',
    (_f, o) => {
      const a = num(o.a);
      const e = num(o.e);
      // σ propagada de a(1 ∓ e) ignorando correlaciones (cota conservadora)
      const sq = Math.hypot(sig(o.a) * (1 - e), a * sig(o.e));
      const sQ = Math.hypot(sig(o.a) * (1 + e), a * sig(o.e));
      if (o.q)
        expect(Math.abs(a * (1 - e) - num(o.q))).toBeLessThan(3 * Math.hypot(sq, sig(o.q)) + 1e-3);
      if (o.Q)
        expect(Math.abs(a * (1 + e) - num(o.Q))).toBeLessThan(3 * Math.hypot(sQ, sig(o.Q)) + 1e-2);
    },
  );

  it('orbita_principal, si existe, apunta a una órbita verificada', () => {
    if (!m.orbita_principal) return;
    const o = m.orbitas.find((x) => x.fuente === m.orbita_principal);
    expect(o?.a.estado).toBe('verificado');
  });

  it('las órbitas publicadas son compatibles entre sí en a, e, i (3σ combinada), salvo discrepancias documentadas', () => {
    for (let x = 0; x < m.orbitas.length; x++)
      for (let y = x + 1; y < m.orbitas.length; y++)
        for (const k of ['a', 'e', 'i'] as const) {
          if (m.orbitas[x]!.discrepancia_documentada || m.orbitas[y]!.discrepancia_documentada)
            continue;
          const p = m.orbitas[x]![k];
          const q = m.orbitas[y]![k];
          expect(Math.abs(num(p) - num(q)), k).toBeLessThan(3 * Math.hypot(sig(p), sig(q)));
        }
  });
});
