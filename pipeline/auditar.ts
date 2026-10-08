/** CLI: `npm run auditoria` → docs/reportes/trazabilidad.md. Sale con error si hay discrepancias. */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { KM_POR_AU } from '../src/core/marcos';
import { RADIO_VISUAL_METEOROIDE_AU } from '../src/scene/sistema-solar';
import type { OrbitaCneos, ResumenCneos } from '../src/cneos/resumen';
import {
  CalidadCneos,
  Fuentes,
  Meteorito,
  RegionEscape,
  RegionesOrigen,
  RespuestaCneos,
} from '../src/schema';
import type { Catalogo } from '../src/ui/catalogo';
import { auditar, informe } from './auditoria';
import { ALTURA_CONVENCIONAL_KM, type TrayectoriaPieza } from './trayectorias-pedigri';

const leer = <T = unknown>(ruta: string): T => JSON.parse(readFileSync(ruta, 'utf8')) as T;
const cneos = leer<Parameters<typeof auditar>[0]['cneos']>('data/cneos/chelyabinsk.json');
const filas = auditar({
  fuentes: Fuentes.parse(leer('data/fuentes.json')),
  meteoritos: readdirSync('data/pedigri')
    .filter((f) => f.endsWith('.json'))
    .map((f) => Meteorito.parse(leer(`data/pedigri/${f}`))),
  regiones: RegionesOrigen.parse(leer('data/regiones-origen.json')),
  escape: RegionEscape.array().parse(leer('data/regiones-escape.json')),
  catalogo: leer<Catalogo>('public/data/catalogo.json'),
  textos: leer('src/i18n/es.json'),
  ficha: {
    cruda: readFileSync('content/fichas/chelyabinsk.md', 'utf8'),
    cneos,
    nClones: leer<{ clones: unknown[] }>('public/data/chelyabinsk-orbitas.json').clones.length,
  },
  cneos,
  radioVisualMeteoroideKm: RADIO_VISUAL_METEOROIDE_AU * KM_POR_AU,
  trayectorias: {
    indice: leer<{ piezas: string[] }>('public/data/trayectorias/indice.json').piezas,
    leer: (id) => leer<TrayectoriaPieza>(`public/data/trayectorias/${id}.json`),
    alturaConvencionalKm: ALTURA_CONVENCIONAL_KM,
  },
  bolidos: {
    crudo: RespuestaCneos.parse(leer('data/cneos/eventos.json')),
    resumen: leer<ResumenCneos>('public/data/cneos/eventos.json'),
    tabla4: CalidadCneos.parse(leer('data/calibracion/pena-asensio-2025-tabla4.json')),
    leerOrbita: (id) => leer<OrbitaCneos>(`public/data/cneos/orbitas/${id}.json`),
  },
});

writeFileSync('docs/reportes/trazabilidad.md', informe(filas));
const errores = filas.filter((f) => f.estado === 'error');
console.log(`Trazabilidad: ${filas.length} datos auditados, ${errores.length} errores.`);
if (errores.length) {
  for (const f of errores) console.error(`- ${f.seccion} · ${f.elemento}: ${f.nota}`);
  process.exit(1);
}
