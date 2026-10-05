/** Construye el contexto de la ficha a partir del dataset (solo valores verificados). */
import type { Meteorito, Valor } from '../schema';
import type { ContextoFicha, DatoFicha } from './ficha';

interface RegistroCneos {
  fuente: string;
  respuesta: { fields: string[]; data: string[][] };
}

const num = (x: number, dec: number) =>
  x.toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });
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

export function contextoFicha(m: Meteorito, cneos: RegistroCneos, nClones: number): ContextoFicha {
  const ctx: ContextoFicha = {};
  const poner = (k: string, d: DatoFicha | undefined) => {
    if (d) ctx[k] = d;
  };
  const dec = (v: Valor) => (String(v.valor).split('.')[1] ?? '').length;
  const n = (v: Valor) => num(v.valor as number, dec(v));

  const fecha = new Date(String(m.fecha_caida.valor));
  poner(
    'fecha',
    dato(m.fecha_caida, () =>
      new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'UTC' }).format(fecha),
    ),
  );
  poner(
    'hora',
    dato(m.fecha_caida, () =>
      new Intl.DateTimeFormat('es', { timeStyle: 'short', timeZone: 'UTC' }).format(fecha),
    ),
  );
  poner(
    'clase',
    dato(m.clase, (v) => String(v.valor)),
  );
  poner(
    'diametro',
    dato(m.diametro_preatmosferico, (v) => num(Math.round(v.valor as number), 0)),
  );
  poner(
    'v_entrada',
    dato(m.radiante_geocentrico?.v_entrada, (v) => num(Math.round(v.valor as number), 0)),
  );

  const { fields, data } = cneos.respuesta;
  const c = (k: string) => data[0]![fields.indexOf(k)]!;
  const desdeCneos = (texto: string): DatoFicha => ({ texto, fuente: cneos.fuente });
  ctx.alt_pico_cneos = desdeCneos(num(Math.round(Number(c('alt'))), 0));
  ctx.lat = desdeCneos(`${num(Number(c('lat')), 1)}° ${c('lat-dir') === 'N' ? 'N' : 'S'}`);
  ctx.lon = desdeCneos(`${num(Number(c('lon')), 1)}° ${c('lon-dir') === 'E' ? 'E' : 'O'}`);
  ctx.energia_kt = desdeCneos(num(Math.round(Number(c('impact-e'))), 0));

  const orbita = m.orbitas.find(
    (o) => o.fuente === 'popova-2013-science' && o.a.estado === 'verificado',
  );
  if (orbita) {
    poner('a', dato(orbita.a, n));
    poner('e', dato(orbita.e, n));
    poner('i', dato(orbita.i, n));
    poner('q', dato(orbita.q, n));
    poner('Q', dato(orbita.Q, n));
    poner(
      'a_sigma',
      dato(orbita.a, (v) => num(v.sigma_publicada ?? v.sigma ?? NaN, dec(v))),
    );
    poner(
      'i_sigma',
      dato(orbita.i, (v) => num(v.sigma_publicada ?? v.sigma ?? NaN, dec(v))),
    );
    poner(
      'nivel_orbita',
      dato(orbita.a, (v) => NIVEL[v.nivel_sigma ?? '1-sigma']!),
    );
  }
  // La ficha atribuye estas probabilidades a Popova et al.: solo se usan las de esa fuente
  for (const p of (m.procedencia ?? []).filter(
    (x) => x.probabilidad.fuente === 'popova-2013-science',
  )) {
    const clave = { 'resonancia-nu6': 'nu6', 'resonancia-3-1': '31', 'cruzadores-marte': 'imc' }[
      p.region
    ];
    if (!clave) continue;
    poner(`p_${clave}`, dato(p.probabilidad, n));
    // El nombre de la región también sale del dataset (evita cifras escritas a mano, p. ej. «3:1»)
    poner(
      `n_${clave}`,
      dato(p.probabilidad, () => p.nombre.charAt(0).toLowerCase() + p.nombre.slice(1)),
    );
  }
  ctx.n_clones = { texto: String(nClones), fuente: 'pena-asensio-2025' };
  return ctx;
}
