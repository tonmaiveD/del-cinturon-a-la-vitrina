/**
 * CLI: `npm run datos:jpl-2008tc3`.
 * Añade a Almahata Sitta la órbita telescópica de 2008 TC3 (JPL Horizons, solución JPL#18) previa
 * al encuentro (2008-09-07 TDB), desde data/verificacion/originales.json, y la fija como órbita
 * principal (decisión del usuario del 2026-10-05; ver docs/reportes/cruzada.md).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Meteorito, type Valor } from '../src/schema';

const RUTA = 'data/pedigri/almahata-sitta.json';
const FUENTE = 'jpl-horizons';
const originales = JSON.parse(readFileSync('data/verificacion/originales.json', 'utf8'));
const tc3 = originales['almahata-sitta'];
const el = tc3.elementos.find((x: { fecha: string }) => x.fecha.includes('2008-Sep-07'));
if (!el) throw new Error('faltan los elementos del 2008-09-07');

const UBICACION =
  'Horizons API, 2008 TC3 (JPL#18), elementos osculadores heliocéntricos eclípticos, 2008-09-07 TDB';
// σ formales de la solución JPL#18 en su época de referencia (SBDB, 2008-10-07 TDB)
const SIGMA = {
  a: 7.4156e-6,
  e: 4.7742e-6,
  i: 3.5374e-5,
  nodo: 1.4708e-6,
  omega: 5.5799e-5,
  q: 1.1632e-6,
};
const NOTA_SIGMA =
  'σ formal de la solución JPL#18 tomada del SBDB en su época (2008-10-07 TDB); se usa como orden de magnitud para esta época.';
const v = (valor: number, unidad: string | undefined, sigma: number): Valor => ({
  valor,
  ...(unidad ? { unidad } : {}),
  sigma,
  sigma_publicada: sigma,
  nivel_sigma: '1-sigma',
  fuente: FUENTE,
  ubicacion: UBICACION,
  estado: 'verificado',
  nota: NOTA_SIGMA,
});

const m = JSON.parse(readFileSync(RUTA, 'utf8'));
const orbita = {
  fuente: FUENTE,
  ubicacion: UBICACION,
  marco: 'ecliptica-J2000',
  epoca: {
    valor: `JD ${el.jd_tdb} TDB (2008-09-07)`,
    fuente: FUENTE,
    ubicacion: UBICACION,
    estado: 'verificado',
    nota: 'Órbita previa al encuentro (Tierra a más de 0,3 AU). Validada con el método propio: D_D = 0,0003 frente a la retropropagación desde el vector geocéntrico.',
  },
  a: v(el.a, 'AU', SIGMA.a),
  e: v(el.e, undefined, SIGMA.e),
  i: v(el.i, 'grados', SIGMA.i),
  nodo: v(el.nodo, 'grados', SIGMA.nodo),
  omega: v(el.omega, 'grados', SIGMA.omega),
  q: v(el.q, 'AU', SIGMA.q),
};
m.orbitas = [orbita, ...m.orbitas.filter((o: { fuente: string }) => o.fuente !== FUENTE)];
m.orbita_principal = FUENTE;
Meteorito.parse(m);
writeFileSync(RUTA, JSON.stringify(m, null, 2) + '\n');
console.log('Almahata Sitta: órbita principal = JPL Horizons (2008 TC3).');
