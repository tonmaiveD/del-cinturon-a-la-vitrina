/**
 * CLI: `npm run datos:granvik-brown`.
 * Importa las 25 caídas con órbita instrumental de Granvik & Brown (2018), Icarus,
 * doi:10.1016/j.icarus.2018.04.012, leyendo el LaTeX original de arXiv:1804.07229 (se descarga a
 * .trabajo/ si no está). Tablas usadas (etiquetas LaTeX del original):
 *   table:trajectorydata  → fecha/hora, posición de referencia, radiante, v∞
 *   table:geophysdata     → clasificación
 *   table:orbits          → a, e, i, Ω, ω (1σ, según el texto §2), época MJD UTC
 *   table:qcapqvgvh       → q, Q, v_g
 *   table:sourceregionslores → probabilidades de región de escape (modelo de baja resolución)
 * Genera data/pedigri/<id>.json. Para Chelyabinsk, que ya existe, solo añade la órbita, la
 * procedencia y la posición de referencia de esta fuente sin tocar el resto.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Meteorito, type Valor } from '../src/schema';

const FUENTE = 'granvik-brown-2018';
const TEX = '.trabajo/gb2018/meteorite_sources.tex';
const NOTA_FORMAL =
  'Las tablas de trayectoria y procedencia no declaran el nivel de la incertidumbre; se asume 1σ.';

if (!existsSync(TEX)) {
  mkdirSync('.trabajo/gb2018', { recursive: true });
  execFileSync('curl', [
    '-sL',
    '-o',
    '.trabajo/gb2018/src.tgz',
    'https://arxiv.org/e-print/1804.07229',
  ]);
  execFileSync('tar', ['xzf', 'src.tgz'], { cwd: '.trabajo/gb2018' });
}
const tex = readFileSync(TEX, 'utf8');

/** Nombres del LaTeX → nombre con diacríticos e id ASCII. */
const NOMBRES: Record<string, [string, string]> = {
  "P\\v{r}\\'ibram": ['Příbram', 'pribram'],
  'Lost City': ['Lost City', 'lost-city'],
  Innisfree: ['Innisfree', 'innisfree'],
  'Bene\\v sov': ['Benešov', 'benesov'],
  Peekskill: ['Peekskill', 'peekskill'],
  'Tagish Lake': ['Tagish Lake', 'tagish-lake'],
  "Mor\\'avka": ['Morávka', 'moravka'],
  Neuschwanstein: ['Neuschwanstein', 'neuschwanstein'],
  'Park Forest': ['Park Forest', 'park-forest'],
  'Villalbeto de la Pe\\~na': ['Villalbeto de la Peña', 'villalbeto-de-la-pena'],
  'Bunburra Rockhole': ['Bunburra Rockhole', 'bunburra-rockhole'],
  'Almahata Sitta': ['Almahata Sitta', 'almahata-sitta'],
  'Buzzard Coulee': ['Buzzard Coulee', 'buzzard-coulee'],
  Maribo: ['Maribo', 'maribo'],
  Jesenice: ['Jesenice', 'jesenice'],
  Grimsby: ['Grimsby', 'grimsby'],
  'Ko\\v sice': ['Košice', 'kosice'],
  'Mason Gully': ['Mason Gully', 'mason-gully'],
  'Kri\\v zevci': ['Križevci', 'krizevci'],
  "Sutter's Mill": ["Sutter's Mill", 'sutters-mill'],
  Novato: ['Novato', 'novato'],
  Chelyabinsk: ['Chelyabinsk', 'chelyabinsk'],
  Annama: ['Annama', 'annama'],
  "\\v Zd'\\'ar nad S\\'azavou": ['Žďár nad Sázavou', 'zdar-nad-sazavou'],
  Ejby: ['Ejby', 'ejby'],
};

/** Filas de datos de la tabla con la etiqueta dada: { nombreLatex: celdas[] }. */
function tabla(etiqueta: string): Map<string, string[]> {
  const i = tex.indexOf(`\\label{${etiqueta}}`);
  if (i < 0) throw new Error(`tabla no encontrada: ${etiqueta}`);
  const ini = tex.indexOf('\\hline', tex.indexOf('\\hline', i) + 1) + '\\hline'.length;
  const fin = tex.indexOf('\\hline', ini);
  const filas = new Map<string, string[]>();
  for (const linea of tex.slice(ini, fin).split('\\\\')) {
    const celdas = linea.split('&').map((c) => c.trim());
    if (celdas.length < 3) continue;
    const nombre = celdas[0]!.replace(/\s+/g, ' ');
    if (!NOMBRES[nombre]) throw new Error(`nombre no reconocido en ${etiqueta}: "${nombre}"`);
    filas.set(nombre, celdas.slice(1));
  }
  if (filas.size !== 25) throw new Error(`${etiqueta}: ${filas.size} filas (se esperaban 25)`);
  return filas;
}

/** "$ 2.4050 \pm 0.0043 $" → [2.405, 0.0043]. */
function conError(celda: string): [number, number] {
  const m = /\$?\s*([-\d.]+)\s*\\pm\s*([\d.]+)\s*\$?/.exec(celda);
  if (!m) throw new Error(`celda sin ±: "${celda}"`);
  return [Number(m[1]), Number(m[2])];
}

const ubic = (etiqueta: string) => `arXiv:1804.07229v1, tabla ${etiqueta}`;
function valor(
  celda: string,
  etiqueta: string,
  unidad: string | undefined,
  nivel: '1-sigma' | 'formal-sin-nivel',
): Valor {
  const [v, s] = conError(celda);
  return {
    valor: v,
    ...(unidad ? { unidad } : {}),
    sigma: s,
    sigma_publicada: s,
    nivel_sigma: nivel,
    fuente: FUENTE,
    ubicacion: ubic(etiqueta),
    estado: 'verificado',
    ...(nivel === 'formal-sin-nivel' ? { nota: NOTA_FORMAL } : {}),
  };
}
const simple = (v: number | string, etiqueta: string, extra: Partial<Valor> = {}): Valor => ({
  valor: v,
  fuente: FUENTE,
  ubicacion: ubic(etiqueta),
  estado: 'verificado',
  ...extra,
});

const trayectoria = tabla('table:trajectorydata');
const geofisica = tabla('table:geophysdata');
const orbitas = tabla('table:orbits');
const qQ = tabla('table:qcapqvgvh');
const procedencia = tabla('table:sourceregionslores');

const REGIONES: [string, string][] = [
  ['hungaria', 'Región de Hungaria'],
  ['resonancia-nu6', 'Resonancia secular ν6'],
  ['phocaea', 'Región de Phocaea'],
  ['resonancia-3-1', 'Resonancia de movimiento medio 3:1 con Júpiter'],
  ['resonancia-5-2', 'Resonancia de movimiento medio 5:2 con Júpiter'],
  ['resonancia-2-1', 'Resonancia de movimiento medio 2:1 con Júpiter'],
  ['cometas-jfc', 'Cometas de la familia de Júpiter'],
];

/** MJD → ISO 8601 UTC. */
const mjdAIso = (mjd: number) => new Date((mjd - 40587) * 86400000).toISOString();

let n = 0;
for (const [latex, [nombre, id]] of Object.entries(NOMBRES)) {
  const tr = trayectoria.get(latex)!;
  const [fecha, horaDec, lat, lon, ra, dec, vInf] = tr;
  // La hora decimal tiene 4 cifras (~0,4 s): se redondea al segundo
  const ms =
    Math.round((Date.parse(`${fecha}T00:00:00Z`) + Number(horaDec) * 3600000) / 1000) * 1000;
  const orb = orbitas.get(latex)!;
  const [q, Q, vg] = qQ.get(latex)!;
  const mjd = Number(orb[5]);
  const T = 'table:trajectorydata';
  const O = 'table:orbits';
  const V = 'table:qcapqvgvh';

  const nuevaOrbita = {
    fuente: FUENTE,
    ubicacion: `${ubic(O)} y ${V}`,
    marco: 'ecliptica-J2000' as const,
    epoca: simple(`MJD ${orb[5]} UTC (${mjdAIso(mjd)})`, O, {
      nota: 'Época de osculación = instante del impacto.',
    }),
    a: valor(orb[0]!, O, 'AU', '1-sigma'),
    e: valor(orb[1]!, O, undefined, '1-sigma'),
    i: valor(orb[2]!, O, 'grados', '1-sigma'),
    nodo: valor(orb[3]!, O, 'grados', '1-sigma'),
    omega: valor(orb[4]!, O, 'grados', '1-sigma'),
    q: valor(q!, V, 'AU', '1-sigma'),
    Q: valor(Q!, V, 'AU', '1-sigma'),
  };
  const nuevaProcedencia = REGIONES.map(([region, nombreRegion], k) => ({
    region,
    nombre: nombreRegion,
    probabilidad: valor(
      procedencia.get(latex)![k + 1]!,
      'table:sourceregionslores',
      '%',
      'formal-sin-nivel',
    ),
  }));
  const puntoTrayectoria = {
    lat: simple(Number(lat), T, {
      unidad: 'grados',
      nota: 'Posición de referencia de la trayectoria, no el punto de caída.',
    }),
    lon: simple(Number(lon), T, { unidad: 'grados' }),
  };

  const ruta = `data/pedigri/${id}.json`;
  let m: Record<string, unknown>;
  if (existsSync(ruta)) {
    // Fusión no destructiva (Chelyabinsk): se reemplazan solo los datos de esta fuente
    m = JSON.parse(readFileSync(ruta, 'utf8'));
    const orbs = (m.orbitas as { fuente: string }[]).filter((o) => o.fuente !== FUENTE);
    m.orbitas = [...orbs, nuevaOrbita];
    const proc = ((m.procedencia ?? []) as { probabilidad: { fuente: string } }[]).filter(
      (p) => p.probabilidad.fuente !== FUENTE,
    );
    m.procedencia = [...proc, ...nuevaProcedencia];
    m.punto_trayectoria ??= puntoTrayectoria;
  } else {
    m = {
      id,
      nombre_oficial: simple(nombre, T, {
        estado: 'pendiente',
        nota: 'Nombre tal como lo da Granvik & Brown 2018; falta confirmarlo en MetBull.',
      }),
      clase: simple(
        geofisica.get(latex)![0]!.replace(/\s+/g, ' ').replace(/ - /g, '-').replace(/- /g, '-'),
        'table:geophysdata',
        {
          nota: 'Clasificación compilada por Granvik & Brown 2018 a partir de la referencia original citada en su tabla.',
        },
      ),
      fecha_caida: simple(new Date(ms).toISOString().replace('.000Z', 'Z'), T, {
        unidad: 'UTC',
        nota: 'Instante de referencia del bólido según la tabla (fecha y hora decimal UTC).',
      }),
      punto_trayectoria: puntoTrayectoria,
      radiante_geocentrico: {
        ra: valor(ra!, T, 'grados', 'formal-sin-nivel'),
        dec: valor(dec!, T, 'grados', 'formal-sin-nivel'),
        v_geocentrica: valor(vg!, V, 'km/s', '1-sigma'),
        v_entrada: valor(vInf!, T, 'km/s', 'formal-sin-nivel'),
      },
      orbitas: [nuevaOrbita],
      procedencia: nuevaProcedencia,
    };
  }
  Meteorito.parse(m); // falla aquí si algo no cumple el esquema
  writeFileSync(ruta, JSON.stringify(m, null, 2) + '\n');
  n++;
}
console.log(`Importadas ${n} caídas desde Granvik & Brown 2018.`);
