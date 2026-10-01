import { describe, expect, it } from 'vitest';
import { validarDataset } from '../../pipeline/validar';

const fuente = (id: string, verificada = true) => ({
  id,
  tipo: 'articulo',
  cita: 'Autor (2000). Título.',
  licencia: 'Cita bibliográfica',
  consultado: '2026-10-01',
  metadatos_verificados: verificada,
});
const valor = (fuenteId: string, estado = 'verificado') => ({ valor: 1, fuente: fuenteId, estado });
const meteorito = (fuenteId: string, estado = 'verificado') => ({
  id: 'prueba',
  nombre_oficial: { valor: 'Prueba', fuente: fuenteId, estado },
  clase: { valor: 'LL5', fuente: fuenteId, estado },
  fecha_caida: { valor: '2000-01-01T00:00:00Z', fuente: fuenteId, estado },
  punto_caida: { lat: valor(fuenteId, estado), lon: valor(fuenteId, estado) },
  orbitas: [],
});

describe('validarDataset', () => {
  it('acepta un dataset coherente', () => {
    const ds = {
      fuentes: [fuente('f')],
      regiones: [],
      pedigri: [{ ruta: 'm.json', contenido: meteorito('f') }],
    };
    expect(validarDataset(ds)).toEqual([]);
  });

  it('rechaza referencias a fuentes inexistentes', () => {
    const ds = {
      fuentes: [fuente('f')],
      regiones: [],
      pedigri: [{ ruta: 'm.json', contenido: meteorito('otra') }],
    };
    expect(validarDataset(ds).join('\n')).toMatch(/fuente inexistente "otra"/);
  });

  it('rechaza valores sin fuente', () => {
    const m = meteorito('f') as Record<string, unknown>;
    m.clase = { valor: 'LL5', estado: 'verificado' };
    const ds = {
      fuentes: [fuente('f')],
      regiones: [],
      pedigri: [{ ruta: 'm.json', contenido: m }],
    };
    expect(validarDataset(ds).length).toBeGreaterThan(0);
  });

  it('impide marcar como verificado un valor de fuente no verificada', () => {
    const ds = {
      fuentes: [fuente('f', false)],
      regiones: [],
      pedigri: [{ ruta: 'm.json', contenido: meteorito('f') }],
    };
    expect(validarDataset(ds).join('\n')).toMatch(/sin metadatos verificados/);
  });

  it('permite valores pendientes de fuentes no verificadas', () => {
    const ds = {
      fuentes: [fuente('f', false)],
      regiones: [],
      pedigri: [{ ruta: 'm.json', contenido: meteorito('f', 'pendiente') }],
    };
    expect(validarDataset(ds)).toEqual([]);
  });

  it('rechaza fuentes duplicadas', () => {
    const ds = { fuentes: [fuente('f'), fuente('f')], regiones: [], pedigri: [] };
    expect(validarDataset(ds).join('\n')).toMatch(/duplicada/);
  });
});
