/**
 * Construye el catálogo de la escena a partir del dataset validado. Solo pasan valores
 * «verificado»; lo pendiente se marca (nombre) o se omite (posición, órbita, probabilidades).
 */
import { semiejeResonancia } from '../src/core/resonancias';
import type { Fuente, Meteorito, Orbita, RegionEscape, RegionesOrigen, Valor } from '../src/schema';
import {
  citaCorta,
  grupoClase,
  type Catalogo,
  type NumSigma,
  type PiezaCatalogo,
  type ZonaEscape,
} from '../src/ui/catalogo';

const verificado = (v: Valor | undefined): v is Valor => v?.estado === 'verificado';
const num = (v: Valor): NumSigma =>
  v.sigma === undefined ? { v: v.valor as number } : { v: v.valor as number, s: v.sigma };

function orbitaPrincipal(m: Meteorito): Orbita | undefined {
  const candidatas = m.orbitas.filter((o) => [o.a, o.e, o.i, o.nodo, o.omega].every(verificado));
  return (
    candidatas.find((o) => o.fuente === m.orbita_principal) ??
    (m.orbita_principal ? undefined : candidatas[0])
  );
}

function pieza(m: Meteorito, regiones: RegionesOrigen): PiezaCatalogo {
  const o = orbitaPrincipal(m);
  const pt = m.punto_trayectoria;
  const escape = new Map<string, PiezaCatalogo['escape'][number]>();
  for (const p of m.procedencia ?? []) {
    if (!verificado(p.probabilidad)) continue;
    const f = p.probabilidad.fuente;
    if (!escape.has(f)) escape.set(f, { fuente: f, regiones: [] });
    escape.get(f)!.regiones.push({
      region: p.region,
      nombre: p.nombre,
      p: p.probabilidad.valor as number,
      ...(p.probabilidad.sigma !== undefined && { sigma: p.probabilidad.sigma }),
    });
  }
  const asoc = regiones.asociaciones.find((r) => r.meteoritos.includes(m.id));
  const sin = regiones.sin_asociacion.find((s) => s.meteorito === m.id);
  if (!asoc && !sin) throw new Error(`${m.id}: sin asociación ni motivo`);
  if (!verificado(m.clase) || !verificado(m.fecha_caida))
    throw new Error(`${m.id}: clase o fecha sin verificar`);

  return {
    id: m.id,
    nombre: {
      valor: String(m.nombre_oficial.valor),
      verificado: m.nombre_oficial.estado === 'verificado',
    },
    clase: { valor: String(m.clase.valor), fuente: m.clase.fuente },
    grupo: grupoClase(String(m.clase.valor)),
    fecha: String(m.fecha_caida.valor),
    punto:
      pt && verificado(pt.lat) && verificado(pt.lon)
        ? { lat: pt.lat.valor as number, lon: pt.lon.valor as number, fuente: pt.lat.fuente }
        : null,
    orbita: o
      ? {
          fuente: o.fuente,
          a: num(o.a),
          e: num(o.e),
          i: num(o.i),
          nodo: num(o.nodo),
          omega: num(o.omega),
          ...(verificado(o.q) && { q: num(o.q) }),
        }
      : null,
    escape: [...escape.values()],
    asociacion: asoc
      ? {
          id: asoc.id,
          nombre: asoc.nombre,
          confianza: asoc.confianza,
          justificacion: asoc.justificacion,
          fuentes: asoc.fuentes,
        }
      : { sin: sin!.motivo, fuentes: sin!.fuentes },
  };
}

export function construirCatalogo(entrada: {
  fuentes: Fuente[];
  meteoritos: Meteorito[];
  regiones: RegionesOrigen;
  escape: RegionEscape[];
}): Catalogo {
  const zonas: ZonaEscape[] = [];
  for (const r of entrada.escape) {
    const g = r.geometria;
    if (!g || !verificado(g.a_min) || !verificado(g.a_max)) continue;
    zonas.push({
      id: r.id,
      nombre: r.nombre,
      a_min: g.a_min.valor as number,
      a_max: g.a_max.valor as number,
      ...(verificado(g.i_min) && { i_min: g.i_min.valor as number }),
      ...(verificado(g.i_max) && { i_max: g.i_max.valor as number }),
      elementos: g.elementos,
      fuentes: [...new Set([g.a_min.fuente, g.a_max.fuente])],
    });
  }
  const piezas = entrada.meteoritos
    .map((m) => pieza(m, entrada.regiones))
    .sort((x, y) => x.nombre.valor.localeCompare(y.nombre.valor, 'es'));
  const usadas = new Set([
    ...piezas.flatMap((p) => [
      p.clase.fuente,
      ...(p.punto ? [p.punto.fuente] : []),
      ...(p.orbita ? [p.orbita.fuente] : []),
      ...p.escape.map((e) => e.fuente),
      ...p.asociacion.fuentes,
    ]),
    ...zonas.flatMap((z) => z.fuentes),
    ...entrada.escape.flatMap((r) => r.fuentes),
  ]);
  const fuentes: Record<string, string> = {};
  for (const id of usadas) {
    const f = entrada.fuentes.find((x) => x.id === id);
    if (!f) throw new Error(`Fuente desconocida: ${id}`);
    fuentes[id] = citaCorta(f.cita);
  }
  return {
    fuentes,
    piezas,
    zonas,
    resonancias: entrada.escape
      .filter((r) => r.resonancia)
      .map((r) => ({
        id: r.id,
        nombre: r.nombre,
        p: r.resonancia!.p,
        q: r.resonancia!.q,
        a: Number(semiejeResonancia(r.resonancia!.p, r.resonancia!.q).toFixed(4)),
        fuentes: r.fuentes,
      })),
    sin_geometria: entrada.escape
      .filter((r) => !r.resonancia && !zonas.some((z) => z.id === r.id))
      .map((r) => ({ id: r.id, nombre: r.nombre })),
  };
}
