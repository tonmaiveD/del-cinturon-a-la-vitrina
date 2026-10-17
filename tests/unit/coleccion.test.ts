import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { RUTAS_COLECCION, type DatosColeccion } from '../../pipeline/coleccion';
import { limpiarFoto, metadatosSensibles } from '../../pipeline/coleccion-fotos';
import { validarDataset } from '../../pipeline/validar';
import { coleccionEnDist, fotosConMetadatos } from '../../pipeline/verificar-dist';
import { vistaEjemplar } from '../../src/coleccion/vista';
import { Meteorito, RegionesOrigen } from '../../src/schema';
import { Ejemplar, MeteoritoColeccion } from '../../src/schema/coleccion';

// Ejemplares de prueba: solo existen aquí, nunca en data/ (no se inventan datos de la colección)
const leer = (r: string): unknown => JSON.parse(readFileSync(r, 'utf8'));
const FUENTE_PRUEBA = {
  id: 'registro-coleccion-prueba',
  tipo: 'registro-coleccion',
  cita: 'Registro de prueba de la colección',
  licencia: 'sin licencia',
  consultado: '2026-10-17',
  metadatos_verificados: true,
};
const pedigri = readdirSync('data/pedigri').map((f) => ({
  ruta: `data/pedigri/${f}`,
  contenido: leer(`data/pedigri/${f}`),
}));
const regiones = RegionesOrigen.parse(leer('data/regiones-origen.json'));

const masa = (g: number, fuente = FUENTE_PRUEBA.id) => ({
  valor: g,
  unidad: 'g',
  fuente,
  estado: 'verificado',
});
const ejemplar = (sku: string, meteorito: string, extra: Record<string, unknown> = {}) => ({
  sku,
  meteorito,
  tipo: 'fragmento',
  masa_muestra: masa(12.3),
  fotos: [],
  revision: { es: { estado: 'borrador' } },
  ...extra,
});
const meteoritoSinOrbita = (id: string, clase: string, extra: Record<string, unknown> = {}) => ({
  id,
  nombre_oficial: { valor: 'Prueba', fuente: FUENTE_PRUEBA.id, estado: 'pendiente' },
  clase: { valor: clase, fuente: FUENTE_PRUEBA.id, estado: 'verificado' },
  ...extra,
});

function errores(coleccion: DatosColeccion): string[] {
  return validarDataset({
    fuentes: [...(leer('data/fuentes.json') as object[]), FUENTE_PRUEBA],
    regiones: leer('data/regiones-origen.json'),
    pedigri,
    coleccion,
  });
}

describe('colección: meteorito ≠ ejemplar (M33)', () => {
  const valida: DatosColeccion = {
    meteoritos: [meteoritoSinOrbita('prueba-h5', 'H5')],
    ejemplares: [
      ejemplar('CHE-001', 'chelyabinsk', { masa_muestra: masa(4.2) }),
      ejemplar('CHE-002', 'chelyabinsk', { masa_muestra: masa(87) }),
      ejemplar('PRU-001', 'prueba-h5'),
    ],
  };

  it('una colección bien formada valida', () => {
    expect(errores(valida)).toEqual([]);
  });

  it('dos ejemplares del mismo meteorito comparten la vista científica sin mezclar masas', () => {
    const met = (valida.meteoritos as unknown[]).map((m) => MeteoritoColeccion.parse(m));
    const pd = pedigri.map((a) => Meteorito.parse(a.contenido));
    const [a, b] = (valida.ejemplares as unknown[]).map((e) => Ejemplar.parse(e));
    expect(vistaEjemplar(a!, pd, met, regiones)).toEqual({
      tipo: 'recorrido',
      pieza: 'chelyabinsk',
    });
    expect(vistaEjemplar(b!, pd, met, regiones)).toEqual(vistaEjemplar(a!, pd, met, regiones));
    expect(a!.masa_muestra.valor).not.toBe(b!.masa_muestra.valor);
  });

  it('sin órbita: procedencia por clase, nunca una órbita', () => {
    const pd = pedigri.map((a) => Meteorito.parse(a.contenido));
    const vista = (clase: string) => {
      const m = MeteoritoColeccion.parse(meteoritoSinOrbita('x', clase));
      return vistaEjemplar(Ejemplar.parse(ejemplar('X-1', 'x')), pd, [m], regiones);
    };
    expect(vista('H5')).toEqual({
      tipo: 'procedencia-por-clase',
      meteorito: 'x',
      asociaciones: ['hebe-h'],
    });
    expect(vista('CM2')).toMatchObject({ asociaciones: ['cm-cinturon-medio'] });
    // 2008 TC3 es el progenitor observado de Almahata Sitta, no de cualquier ureilita
    expect(vista('ureilita')).toMatchObject({ tipo: 'sin-procedencia' });
    expect(vista('L/LL5')).toMatchObject({ tipo: 'sin-procedencia', motivo: 'clase ambigua' });
    // Un meteorito de la colección no admite órbita propia
    expect(
      errores({
        meteoritos: [meteoritoSinOrbita('x', 'H5', { orbitas: [] })],
        ejemplares: [ejemplar('X-1', 'x')],
      }).some((e) => e.includes('orbitas')),
    ).toBe(true);
  });

  it('la masa del ejemplar es un pesaje propio, en gramos y menor que la total', () => {
    const con = (e: Record<string, unknown>, meteoritos: unknown[] = []) =>
      errores({ meteoritos, ejemplares: [e] }).join('\n');
    expect(
      con(ejemplar('A', 'chelyabinsk', { masa_muestra: masa(5, 'popova-2013-science') })),
    ).toMatch(/registro de la colección/);
    expect(
      con(ejemplar('A', 'chelyabinsk', { masa_muestra: { ...masa(5), unidad: 'kg' } })),
    ).toMatch(/gramos/);
    const total = { valor: 0.5, unidad: 'kg', fuente: FUENTE_PRUEBA.id, estado: 'verificado' };
    expect(
      con(ejemplar('A', 'p', { masa_muestra: masa(500) }), [
        meteoritoSinOrbita('p', 'H5', { masa_total: total }),
      ]),
    ).toMatch(/masa total/);
    // El ejemplar no tiene masa total, clase ni órbita propias
    expect(con(ejemplar('A', 'chelyabinsk', { masa_total: total }))).toMatch(/masa_total/);
    expect(con(ejemplar('A', 'chelyabinsk', { clase: 'LL5' }))).toMatch(/clase/);
  });

  it('SKU y fotos únicos; el meteorito debe existir', () => {
    const foto = {
      archivo: 'IMG_0001.jpg',
      descripcion: { es: 'Fragmento con costra de fusión' },
      credito: 'Prueba',
      licencia: 'todos los derechos reservados',
    };
    const txt = errores({
      ejemplares: [
        ejemplar('A', 'chelyabinsk', { fotos: [foto] }),
        ejemplar('A', 'chelyabinsk', { fotos: [foto] }),
        ejemplar('B', 'no-existe'),
      ],
    }).join('\n');
    expect(txt).toMatch(/SKU duplicado/);
    expect(txt).toMatch(/IMG_0001\.jpg ya es de A/);
    expect(txt).toMatch(/meteorito inexistente "no-existe"/);
  });

  it('revisión por idioma: aprobada exige revisor y fecha; en inglés exige los textos en inglés', () => {
    expect(
      errores({
        ejemplares: [ejemplar('A', 'chelyabinsk', { revision: { es: { estado: 'aprobada' } } })],
      }).join('\n'),
    ).toMatch(/revisado_por y fecha_revision/);
    const aprobada = { estado: 'aprobada', revisado_por: 'Prueba', fecha_revision: '2026-10-17' };
    expect(
      errores({
        ejemplares: [
          ejemplar('A', 'chelyabinsk', {
            custodia: { es: 'Colección privada desde 2014' },
            revision: { es: aprobada, en: aprobada },
          }),
        ],
      }).join('\n'),
    ).toMatch(/sin todos los textos en inglés/);
  });
});

describe('colección: campos privados fuera de lo público (M32)', () => {
  it('un campo privado escrito en el archivo público no valida', () => {
    const txt = errores({
      ejemplares: [ejemplar('A', 'chelyabinsk', { costo: { valor: 120, moneda: 'USD' } })],
    }).join('\n');
    expect(txt).toMatch(/costo/);
  });

  it('la parte privada solo admite SKU existentes', () => {
    expect(
      errores({ ejemplares: [], privados: [{ sku: 'FANTASMA', proveedor: 'X' }] }).join('\n'),
    ).toMatch(/FANTASMA — no existe/);
  });

  it('git ignora la carpeta privada y no contiene ningún archivo de ella', () => {
    const ignorado = execFileSync('git', [
      'check-ignore',
      '--no-index',
      `${RUTAS_COLECCION.privado}/ejemplares.json`,
    ]);
    expect(String(ignorado).trim()).toBe(`${RUTAS_COLECCION.privado}/ejemplares.json`);
    expect(String(execFileSync('git', ['ls-files', RUTAS_COLECCION.privado])).trim()).toBe('');
  });

  it('las claves privadas no se usan en los datos públicos (verificar-dist las busca en dist/)', () => {
    const json = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const p = join(dir, d.name);
        if (d.isDirectory()) return p === RUTAS_COLECCION.privado ? [] : json(p);
        return p.endsWith('.json') ? [p] : [];
      });
    const usan = [...json('data'), 'src/i18n/es.json'].filter((p) =>
      /"(costo|proveedor|fecha_compra|notas_privadas)":/.test(readFileSync(p, 'utf8')),
    );
    expect(usan).toEqual([]);
  });

  it('el build falla si un dato privado o un ejemplar en borrador aparecen en dist/', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    writeFileSync(join(dist, 'index.js'), 'const x = "Meteoritos del Desierto SRL";');
    writeFileSync(join(dist, 'data.json'), '{"texto":"Colección privada desde 2014"}');
    const c: DatosColeccion = {
      ejemplares: [
        ejemplar('A', 'chelyabinsk', { custodia: { es: 'Colección privada desde 2014' } }),
      ],
      privados: [{ sku: 'A', proveedor: 'Meteoritos del Desierto SRL' }],
    };
    const txt = coleccionEnDist(dist, c).join('\n');
    expect(txt).toMatch(/dato privado de A aparece en .*index\.js/);
    expect(txt).toMatch(/texto de A \(borrador\) aparece en .*data\.json/);
    expect(coleccionEnDist(dist, { ejemplares: [], privados: [] })).toEqual([]);
  });

  it('las fotos publicadas salen sin EXIF y el build rechaza una que lo conserve', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fotos-'));
    const original = join(dir, 'original.jpg');
    await sharp({ create: { width: 64, height: 48, channels: 3, background: '#806040' } })
      .jpeg()
      .withExif({ IFD0: { Artist: 'Prueba', Copyright: 'Prueba' } })
      .toFile(original);
    expect(await metadatosSensibles(original)).toContain('exif');
    const dist = join(dir, 'dist');
    mkdirSync(join(dist, 'coleccion'), { recursive: true });
    await limpiarFoto(original, join(dist, 'coleccion', 'A-1.webp'));
    expect(await fotosConMetadatos(dist)).toEqual([]);
    writeFileSync(join(dist, 'coleccion', 'A-2.jpg'), readFileSync(original));
    expect((await fotosConMetadatos(dist)).join('\n')).toMatch(/A-2\.jpg: conserva metadatos/);
  });
});
