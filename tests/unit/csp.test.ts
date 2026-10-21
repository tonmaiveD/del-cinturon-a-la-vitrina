import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { contenidoEnLinea, politica } from '../../pipeline/csp';

describe('política de seguridad de contenido (M31)', () => {
  it('autoriza el estilo del tema por su huella y nada más en línea', () => {
    const css = ':root { --acento: #ffb25c; }';
    const { hashes, errores } = contenidoEnLinea(
      `<head><style id="tema">${css}</style><script type="module" src="/a.js"></script></head>`,
    );
    expect(errores).toEqual([]);
    expect(hashes).toEqual([createHash('sha256').update(css).digest('base64')]);
    const p = politica(hashes);
    expect(p).toContain(`style-src 'self' 'sha256-${hashes[0]}'`);
    expect(p).toContain("script-src 'self'");
    expect(p).toContain("object-src 'none'");
    expect(p).not.toContain('unsafe-inline');
  });

  it('el build falla ante scripts, estilos o atributos style en línea', () => {
    const errores = (h: string) => contenidoEnLinea(h).errores;
    expect(errores('<script>alert(1)</script>')).toHaveLength(1);
    expect(errores('<style>p{}</style>')).toHaveLength(1);
    expect(errores('<p style="color:red">x</p>')).toHaveLength(1);
  });
});
