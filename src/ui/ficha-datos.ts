/** Construye el contexto de la ficha a partir del dataset (solo valores verificados). */
import { radioCaptura } from '../core/encuentro';
import { fecha as formatoFecha, fijo } from '../i18n/formato';
import type { Meteorito, Valor } from '../schema';
import { citaCorta } from './catalogo';
import type { ContextoFicha, DatoFicha } from './ficha';

interface RegistroCneos {
  fuente: string;
  consultado: string;
  respuesta: { fields: string[]; data: (string | null)[][] };
}

/** Lo que la ficha necesita de data/fuentes.json: la cita, para nombrar un modelo o fórmula. */
export interface FuenteCita {
  id: string;
  cita: string;
}

/** Julios por kilotón de TNT (definición convencional). */
const J_POR_KT = 4.184e12;
/** El campo `energy` del CNEOS viene en unidades de 10¹⁰ J (documentación de la API). */
const J_POR_UNIDAD_ENERGY = 1e10;
/** Fórmula con la que el CNEOS pasa de energía radiada a energía de impacto. */
const FUENTE_ENERGIA_IMPACTO = 'brown-2002';
/** Errores típicos del CNEOS por grupo (Tabla 4), usados en la validación con Chelyabinsk. */
const FUENTE_ERRORES_CNEOS = 'pena-asensio-2025';

const num = fijo;
const NIVEL: Record<string, string> = {
  '1-sigma': '1σ',
  '2-sigma': '2σ',
  '3-sigma': '3σ',
  'formal-sin-nivel': 'incertidumbre formal sin nivel declarado',
};

function dato(v: Valor | undefined, texto: (v: Valor) => string): DatoFicha | undefined {
  if (!v || v.estado !== 'verificado') return undefined;
  return { texto: texto(v), fuente: v.fuente };
}

export function contextoFicha(
  m: Meteorito,
  cneos: RegistroCneos,
  fuentes: FuenteCita[],
): ContextoFicha {
  const ctx: ContextoFicha = {};
  const poner = (k: string, d: DatoFicha | undefined) => {
    if (d) ctx[k] = d;
  };
  const dec = (v: Valor) => (String(v.valor).split('.')[1] ?? '').length;
  const n = (v: Valor) => num(v.valor as number, dec(v));
  const cita = (id: string): DatoFicha | undefined => {
    const f = fuentes.find((x) => x.id === id);
    return f && { texto: citaCorta(f.cita), fuente: id };
  };

  const fecha = new Date(String(m.fecha_caida.valor));
  poner(
    'fecha',
    dato(m.fecha_caida, () => formatoFecha(fecha, { dateStyle: 'long', timeZone: 'UTC' })),
  );
  poner(
    'hora',
    dato(m.fecha_caida, () =>
      formatoFecha(fecha, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'UTC',
      }),
    ),
  );
  poner(
    'clase',
    dato(m.clase, (v) => String(v.valor)),
  );
  // La cifra final de la clase (p. ej. el 5 de LL5) es el tipo petrológico
  poner(
    'tipo_petrologico',
    dato(m.clase, (v) => /(\d+)$/.exec(String(v.valor))?.[1] ?? ''),
  );
  poner(
    'diametro',
    dato(m.diametro_preatmosferico, (v) => num(Math.round(v.valor as number), 0)),
  );
  poner('v_entrada', dato(m.radiante_geocentrico?.v_entrada, n));
  poner('alt_pico_popova', dato(m.atmosfera?.altura_pico_brillo, n));
  poner('alt_destello', dato(m.atmosfera?.altura_destello_fragmentos, n));

  // Registro del CNEOS: cifras tal como las publica, con su fecha de consulta
  const { fields, data } = cneos.respuesta;
  const c = (k: string) => data[0]![fields.indexOf(k)]!;
  const desdeCneos = (texto: string): DatoFicha => ({ texto, fuente: cneos.fuente });
  ctx.alt_pico_cneos = desdeCneos(num(Number(c('alt')), 1));
  ctx.v_pico_cneos = desdeCneos(num(Number(c('vel')), 1));
  ctx.lat = desdeCneos(`${num(Number(c('lat')), 1)}° ${c('lat-dir') === 'N' ? 'N' : 'S'}`);
  ctx.lon = desdeCneos(`${num(Number(c('lon')), 1)}° ${c('lon-dir') === 'E' ? 'E' : 'O'}`);
  ctx.energia_kt = desdeCneos(num(Number(c('impact-e')), 0));
  ctx.energia_radiada_kt = desdeCneos(
    num(Math.round((Number(c('energy')) * J_POR_UNIDAD_ENERGY) / J_POR_KT), 0),
  );
  ctx.cneos_consultado = desdeCneos(
    formatoFecha(new Date(cneos.consultado), { dateStyle: 'long', timeZone: 'UTC' }),
  );
  poner('ref_energia', cita(FUENTE_ENERGIA_IMPACTO));
  // Errores típicos del CNEOS con los que se valida la órbita calculada desde su vector
  poner('ref_errores_cneos', cita(FUENTE_ERRORES_CNEOS));

  // La órbita que cita el texto es la principal: la misma que se dibuja en el recorrido
  const orbita = m.orbitas.find(
    (o) => o.fuente === m.orbita_principal && o.a.estado === 'verificado',
  );
  if (orbita) {
    poner('a', dato(orbita.a, n));
    poner('e', dato(orbita.e, n));
    poner('i', dato(orbita.i, n));
    poner('q', dato(orbita.q, n));
    poner('Q', dato(orbita.Q, n));
    // σ a 1σ (la que usa la nube) y tal como la publica la fuente
    for (const k of ['a', 'e', 'i', 'q'] as const) {
      const v = orbita[k];
      poner(
        `${k}_sigma1`,
        dato(v, (x) => num(x.sigma ?? NaN, dec(x))),
      );
      poner(
        `${k}_sigma`,
        dato(v, (x) => num(x.sigma_publicada ?? x.sigma ?? NaN, dec(x))),
      );
    }
    // El esquema guarda `sigma` siempre a 1σ: es la que usa la nube
    poner(
      'nivel_nube',
      dato(orbita.a, () => NIVEL['1-sigma']!),
    );
    poner(
      'nivel_orbita',
      dato(orbita.a, (v) => NIVEL[v.nivel_sigma ?? '1-sigma']!),
    );
  }
  // Incertidumbre del radiante y de v_g: la que se sortea para dibujar la nube
  const r = m.radiante_geocentrico;
  if (r) {
    for (const [k, v] of [
      ['ra', r.ra],
      ['dec', r.dec],
      ['vg', r.v_geocentrica],
    ] as const) {
      poner(
        `${k}_sigma1`,
        dato(v, (x) => num(x.sigma ?? NaN, dec(x))),
      );
      poner(
        `${k}_sigma`,
        dato(v, (x) => num(x.sigma_publicada ?? x.sigma ?? NaN, dec(x))),
      );
    }
    poner('vg', dato(r.v_geocentrica, n));
    // Radio de captura para la v_g publicada (el de cada órbita de la nube varía con su velocidad,
    // de ahí el redondeo a centenas): el criterio de encuentro que describe la ficha
    poner(
      'radio_captura',
      dato(r.v_geocentrica, (v) => num(Math.round(radioCaptura(v.valor as number) / 100) * 100, 0)),
    );
    poner(
      'nivel_radiante',
      dato(r.ra, (v) => NIVEL[v.nivel_sigma ?? '1-sigma']!),
    );
  }
  // La ficha atribuye estas probabilidades a Popova et al.: solo se usan las de esa fuente
  for (const p of (m.procedencia ?? []).filter(
    (x) => x.probabilidad.fuente === 'popova-2013-science',
  )) {
    const clave = {
      'resonancia-nu6': 'nu6',
      'resonancia-3-1': '31',
      'cruzadores-marte': 'imc',
      'cinturon-exterior': 'ob',
      'cometas-jfc': 'jfc',
    }[p.region];
    if (!clave) continue;
    poner(`p_${clave}`, dato(p.probabilidad, n));
    // El nombre de la región también sale del dataset (evita cifras escritas a mano, p. ej. «3:1»)
    poner(
      `n_${clave}`,
      dato(p.probabilidad, () => p.nombre.charAt(0).toLowerCase() + p.nombre.slice(1)),
    );
    if (p.modelo) poner('modelo_procedencia', cita(p.modelo));
  }
  return ctx;
}
