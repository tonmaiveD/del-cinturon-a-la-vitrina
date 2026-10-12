import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_DESAPARECIDOS, validarRespuesta, type RespuestaCruda } from '../../src/cneos/contrato';

const actual = (
  JSON.parse(readFileSync('data/cneos/eventos.json', 'utf8')) as { respuesta: RespuestaCruda }
).respuesta;
const copia = (): RespuestaCruda => structuredClone(actual);
const fila = (r: RespuestaCruda, campo: string, valor: string | null, n = 0) => {
  r.data[n]![r.fields.indexOf(campo)] = valor;
  return r;
};

describe('contrato de entrada del CNEOS (M08)', () => {
  it('la respuesta guardada cumple el contrato, también frente a sí misma', () => {
    const { errores } = validarRespuesta(actual, actual);
    expect(errores).toEqual([]);
  });

  it('advierte (sin rechazar) de vectores incoherentes con la velocidad publicada', () => {
    expect(validarRespuesta(actual).advertencias.join(' ')).toMatch(/\|v\| distinto/);
  });

  it.each([
    ['versión desconocida', (r: RespuestaCruda) => ((r.signature.version = '99'), r), /versión/],
    ['recuento incoherente', (r: RespuestaCruda) => ((r.count = '5'), r), /recuento/],
    ['energía ilegible', (r: RespuestaCruda) => fila(r, 'energy', 'abc'), /energy no es un número/],
    ['latitud imposible', (r: RespuestaCruda) => fila(r, 'lat', '95'), /latitud/],
    ['ubicación a medias', (r: RespuestaCruda) => fila(r, 'lon-dir', null), /ubicación incompleta/],
    [
      'vector a medias',
      (r: RespuestaCruda) => fila(r, 'vz', null),
      /vector de velocidad incompleto/,
    ],
    ['fecha mal formada', (r: RespuestaCruda) => fila(r, 'date', '2026/10/04'), /fecha inválida/],
    [
      'fecha repetida',
      (r: RespuestaCruda) => fila(r, 'date', r.data[1]![r.fields.indexOf('date')]!),
      /fecha repetida/,
    ],
    [
      'campo ausente',
      (r: RespuestaCruda) => ((r.fields = r.fields.filter((f) => f !== 'vx')), r),
      /faltan campos: vx/,
    ],
    [
      'fila incompleta',
      (r: RespuestaCruda) => ((r.data[0] = r.data[0]!.slice(0, 5)), r),
      /5 valores para 12 campos/,
    ],
  ])('rechaza: %s', (_, estropear, motivo) => {
    const { errores } = validarRespuesta(estropear(copia()));
    expect(errores.join(' | ')).toMatch(motivo);
  });

  it('cuarentena si desaparecen muchos eventos respecto de la descarga anterior', () => {
    const nueva = copia();
    nueva.data = nueva.data.slice(MAX_DESAPARECIDOS + 1);
    nueva.count = String(nueva.data.length);
    expect(validarRespuesta(nueva, actual).errores.join(' ')).toMatch(/cuarentena/);
    // Unos pocos eventos retirados por la fuente no detienen nada
    const pocos = copia();
    pocos.data = pocos.data.slice(2);
    pocos.count = String(pocos.data.length);
    expect(validarRespuesta(pocos, actual).errores).toEqual([]);
  });
});
