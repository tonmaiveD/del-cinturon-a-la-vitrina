import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARCHIVO_CALCULO, huellaEvento } from '../../pipeline/cneos-calculo';
import { metodoCneos } from '../../pipeline/cneos-metodo';
import { dependenciasDelMetodo } from '../../pipeline/huella-metodo';
import { leerEventos } from '../../src/cneos/eventos';
import type { OrbitaCneos } from '../../src/cneos/resumen';
import { CalidadCneos, RespuestaCneos } from '../../src/schema';

const leer = (r: string): unknown => JSON.parse(readFileSync(r, 'utf8'));

describe('huella del método del CNEOS (M18)', () => {
  const { archivos, paquetes } = dependenciasDelMetodo(ARCHIVO_CALCULO);

  it('cubre todo el código que produce las órbitas, también la lectura de cada evento', () => {
    for (const f of [
      ARCHIVO_CALCULO,
      'src/cneos/eventos.ts', // registroDe(): fuera de la huella hasta el 2026-10-17
      'src/core/orbita-bolido.ts',
      'src/core/integrador.ts',
      'src/core/dinamica.ts',
      'src/core/montecarlo.ts',
      'src/core/muestreo.ts',
    ])
      expect(archivos).toContain(f);
    expect(paquetes).toEqual(['astronomy-engine']);
  });

  it('no incluye lo que no cambia el resultado (retocarlo no obliga a recalcular)', () => {
    for (const f of [
      'pipeline/cneos-orbitas.ts',
      'pipeline/cneos-metodo.ts',
      'pipeline/huella-metodo.ts',
      'src/schema/index.ts',
      'src/cneos/resumen.ts', // solo tipos
      'src/core/encuentro.ts',
      'src/core/resonancias.ts',
      'src/core/similitud.ts',
    ])
      expect(archivos).not.toContain(f);
  });

  it('las órbitas guardadas corresponden al código actual (si no, recalcularlas en local)', () => {
    // Si este test falla, el código del cálculo cambió: `CNEOS_FRAGMENTO=k/n npm run
    // datos:cneos:orbitas` en paralelo y una pasada final (ver CLAUDE.md). El bot no podría
    // recalcular las 260 en su tiempo límite.
    const metodo = metodoCneos(
      CalidadCneos.parse(leer('data/calibracion/pena-asensio-2025-tabla4.json')),
    );
    const crudo = RespuestaCneos.parse(leer('data/cneos/eventos.json'));
    const desfasadas = leerEventos(crudo.respuesta)
      .filter((ev) => ev.calidad === 'orbita')
      .filter((ev) => {
        const o = leer(`public/data/cneos/orbitas/${ev.id}.json`) as OrbitaCneos;
        return (
          o.huella !== huellaEvento(ev, metodo) ||
          ('metodo' in o && o.metodo.huella !== metodo.huella)
        );
      })
      .map((ev) => ev.id);
    expect(desfasadas).toEqual([]);
  });
});
