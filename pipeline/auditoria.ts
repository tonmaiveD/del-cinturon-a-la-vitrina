/**
 * Auditoría de trazabilidad: recorre lo que muestra la interfaz y comprueba, dato por dato, que
 * coincide con un valor «verificado» del dataset con fuente de metadatos verificados, o que es un
 * cálculo documentado o una convención visual declarada. Lo pendiente solo puede aparecer marcado.
 * Además, ninguna cifra puede estar escrita a mano en los textos de la interfaz salvo las de la
 * lista de convenciones (con su motivo).
 */
import { semiejeResonancia } from '../src/core/resonancias';
import type { Fuente, Meteorito, RegionEscape, RegionesOrigen, Valor } from '../src/schema';
import type { Catalogo, NumSigma } from '../src/ui/catalogo';
import { leerFicha, marcadores } from '../src/ui/ficha';
import { contextoFicha } from '../src/ui/ficha-datos';

export type EstadoFila = 'verificado' | 'pendiente-marcado' | 'calculado' | 'convencion' | 'error';

export interface Fila {
  seccion: string;
  elemento: string;
  valor: string;
  fuente: string;
  estado: EstadoFila;
  nota?: string;
}

/**
 * Cifras permitidas en los textos de la interfaz (`src/i18n/es.json`), por clave. Cualquier otra
 * cifra es un error: los datos se pasan como parámetros desde el dataset.
 */
export const CIFRAS_PERMITIDAS: Record<string, { cifras: string[]; motivo: string }> = {
  'app.estado': { cifras: ['2'], motivo: 'número de fase del proyecto' },
  'escena.descripcion': { cifras: ['3'], motivo: 'nombre del tipo de visualización («3D»)' },
  'escala.visual.tierra': {
    cifras: ['60'],
    motivo: 'convención visual: radio dibujado del marcador en escala visual (src/scene/tierra.ts)',
  },
  'escala.visual.sistema-solar': {
    cifras: ['900', '000'],
    motivo: 'convención visual: RADIO_VISUAL_METEOROIDE_AU ≈ 900 000 km (se comprueba abajo)',
  },
  'desc.tierra': {
    cifras: ['100'],
    motivo: 'convención visual: altura desde la que se dibuja la entrada (ALTURA_INICIO_KM)',
  },
  'velocidad.60': { cifras: ['1'], motivo: 'opción de velocidad de la interfaz' },
  'velocidad.3600': { cifras: ['1'], motivo: 'opción de velocidad de la interfaz' },
  'velocidad.86400': { cifras: ['1'], motivo: 'opción de velocidad de la interfaz' },
  'velocidad.864000': { cifras: ['10'], motivo: 'opción de velocidad de la interfaz' },
  'velocidad.1000000': {
    cifras: ['1', '000', '000'],
    motivo: 'opción de velocidad de la interfaz',
  },
  'pieza.orbita': { cifras: ['1'], motivo: 'notación del nivel de incertidumbre («1σ»)' },
  'procedencia.escape-nota': { cifras: ['1'], motivo: 'notación («±1σ»)' },
  'desc.sistema-solar.pieza': { cifras: ['1'], motivo: 'notación («1σ»)' },
  'zona.resonancia-3-1': { cifras: ['3', '1'], motivo: 'nombre de la resonancia p:q' },
  'zona.resonancia-5-2': { cifras: ['5', '2'], motivo: 'nombre de la resonancia p:q' },
  'zona.resonancia-2-1': { cifras: ['2', '1'], motivo: 'nombre de la resonancia p:q' },
  'desc.regiones': { cifras: ['6'], motivo: 'nombre de la resonancia secular («ν6»)' },
};

export interface EntradaAuditoria {
  fuentes: Fuente[];
  meteoritos: Meteorito[];
  regiones: RegionesOrigen;
  escape: RegionEscape[];
  catalogo: Catalogo;
  textos: Record<string, string>;
  ficha?: { cruda: string; cneos: Parameters<typeof contextoFicha>[1]; nClones: number };
  cneos: { fuente: string; respuesta: { fields: string[]; data: string[][] } };
  radioVisualMeteoroideKm: number;
}

export function auditar(e: EntradaAuditoria): Fila[] {
  const filas: Fila[] = [];
  const fuentes = new Map(e.fuentes.map((f) => [f.id, f]));
  const meteoritos = new Map(e.meteoritos.map((m) => [m.id, m]));

  /** Compara un valor mostrado con el Valor del dataset del que procede. */
  function contrastar(
    seccion: string,
    elemento: string,
    mostrado: number | string,
    original: Valor | undefined,
    fuenteMostrada: string,
    sigmaMostrada?: number,
    /** La interfaz muestra la incertidumbre de este dato: debe ser la del origen. */
    conSigma = false,
  ): void {
    const fila: Fila = {
      seccion,
      elemento,
      valor: sigmaMostrada === undefined ? String(mostrado) : `${mostrado} ± ${sigmaMostrada}`,
      fuente: fuenteMostrada,
      estado: 'verificado',
    };
    const fallos: string[] = [];
    if (!original) fallos.push('sin valor de origen en el dataset');
    else {
      if (original.estado !== 'verificado') fallos.push(`origen en estado «${original.estado}»`);
      if (original.valor !== mostrado) fallos.push(`origen = ${String(original.valor)}`);
      if (original.fuente !== fuenteMostrada) fallos.push(`fuente de origen = ${original.fuente}`);
      if (conSigma && original.sigma !== sigmaMostrada)
        fallos.push(`σ de origen = ${String(original.sigma)}`);
    }
    const f = fuentes.get(fuenteMostrada);
    if (!f) fallos.push('fuente inexistente');
    else if (!f.metadatos_verificados) fallos.push('fuente con metadatos sin verificar');
    if (fallos.length) Object.assign(fila, { estado: 'error', nota: fallos.join('; ') });
    filas.push(fila);
  }
  const ns = (x: NumSigma) => [x.v, x.s] as const;

  // ---------- A. Catálogo (panel, globo y nubes) ----------
  for (const p of e.catalogo.piezas) {
    const m = meteoritos.get(p.id);
    const s = `Pieza: ${p.id}`;
    if (!m) {
      filas.push({
        seccion: s,
        elemento: 'pieza',
        valor: p.id,
        fuente: '—',
        estado: 'error',
        nota: 'no está en data/pedigri',
      });
      continue;
    }
    const nombreVerificado = m.nombre_oficial.estado === 'verificado';
    filas.push({
      seccion: s,
      elemento: 'nombre',
      valor: p.nombre.valor,
      fuente: m.nombre_oficial.fuente,
      estado:
        p.nombre.verificado !== nombreVerificado || p.nombre.valor !== m.nombre_oficial.valor
          ? 'error'
          : nombreVerificado
            ? 'verificado'
            : 'pendiente-marcado',
      ...(!nombreVerificado && { nota: 'se muestra con el aviso «pendiente de verificación»' }),
    });
    contrastar(s, 'clase', p.clase.valor, m.clase, p.clase.fuente);
    contrastar(s, 'fecha', p.fecha, m.fecha_caida, m.fecha_caida.fuente);
    if (p.punto) {
      contrastar(
        s,
        'posición de referencia: lat',
        p.punto.lat,
        m.punto_trayectoria?.lat,
        p.punto.fuente,
      );
      contrastar(
        s,
        'posición de referencia: lon',
        p.punto.lon,
        m.punto_trayectoria?.lon,
        p.punto.fuente,
      );
    }
    if (p.orbita) {
      const o = m.orbitas.find((x) => x.fuente === p.orbita!.fuente);
      if (m.orbita_principal && m.orbita_principal !== p.orbita.fuente)
        filas.push({
          seccion: s,
          elemento: 'órbita',
          valor: p.orbita.fuente,
          fuente: p.orbita.fuente,
          estado: 'error',
          nota: `la principal declarada es ${m.orbita_principal}`,
        });
      for (const k of ['a', 'e', 'i', 'nodo', 'omega'] as const)
        contrastar(
          s,
          `órbita: ${k}`,
          ns(p.orbita[k])[0],
          o?.[k],
          p.orbita.fuente,
          ns(p.orbita[k])[1],
          true,
        );
    }
    for (const g of p.escape)
      for (const r of g.regiones)
        contrastar(
          s,
          `escape: ${r.region}`,
          r.p,
          m.procedencia?.find((x) => x.region === r.region && x.probabilidad.fuente === g.fuente)
            ?.probabilidad,
          g.fuente,
          r.sigma,
          true,
        );
    const a = p.asociacion;
    const origen = e.regiones.asociaciones.find((x) => x.meteoritos.includes(p.id));
    const sin = e.regiones.sin_asociacion.find((x) => x.meteorito === p.id);
    const coincide =
      'confianza' in a
        ? origen?.id === a.id && origen.confianza === a.confianza
        : !origen && sin?.motivo === a.sin;
    filas.push({
      seccion: s,
      elemento: 'asociación con progenitor',
      valor: 'confianza' in a ? `${a.nombre} (${a.confianza})` : 'sin asociación',
      fuente: a.fuentes.join(', '),
      estado: coincide && a.fuentes.every((f) => fuentes.has(f)) ? 'verificado' : 'error',
      nota: 'asignación explícita en data/regiones-origen.json',
    });
  }

  // ---------- B. Regiones de escape dibujadas ----------
  for (const z of e.catalogo.zonas) {
    const g = e.escape.find((r) => r.id === z.id)?.geometria;
    const s = `Región: ${z.id} (${z.elementos})`;
    contrastar(s, 'a_min', z.a_min, g?.a_min, g?.a_min.fuente ?? '—');
    contrastar(s, 'a_max', z.a_max, g?.a_max, g?.a_max.fuente ?? '—');
    if (z.i_max !== undefined) contrastar(s, 'i_max', z.i_max, g?.i_max, g?.i_max?.fuente ?? '—');
    if (z.i_min !== undefined) contrastar(s, 'i_min', z.i_min, g?.i_min, g?.i_min?.fuente ?? '—');
  }
  for (const r of e.catalogo.resonancias) {
    const calculado = semiejeResonancia(r.p, r.q);
    filas.push({
      seccion: 'Resonancias',
      elemento: `${r.p}:${r.q} (centro nominal)`,
      valor: `${r.a} AU`,
      fuente: r.fuentes.join(', '),
      estado: Math.abs(calculado - r.a) < 1e-4 ? 'calculado' : 'error',
      nota: 'a = a_J·(q/p)^(2/3), a_J osculador de Júpiter en J2000 (astronomy-engine)',
    });
  }

  // ---------- C. Vista Tierra de Chelyabinsk (registro CNEOS) ----------
  const { fields, data } = e.cneos.respuesta;
  for (const k of ['date', 'alt', 'lat', 'lat-dir', 'lon', 'lon-dir', 'vx', 'vy', 'vz']) {
    const v = data[0]?.[fields.indexOf(k)];
    filas.push({
      seccion: 'Chelyabinsk: registro CNEOS (vista Tierra y recorrido)',
      elemento: k,
      valor: String(v),
      fuente: e.cneos.fuente,
      estado: v !== undefined && fuentes.has(e.cneos.fuente) ? 'verificado' : 'error',
      nota: 'respuesta cruda de la API guardada en data/cneos/chelyabinsk.json',
    });
  }
  filas.push({
    seccion: 'Chelyabinsk: registro CNEOS (vista Tierra y recorrido)',
    elemento: 'nube de órbitas y trayectoria',
    valor: 'public/data/chelyabinsk-orbitas.json, chelyabinsk-trayectoria.json',
    fuente: 'cneos-fireball-api, pena-asensio-2025',
    estado: 'calculado',
    nota: 'Monte Carlo con σ de Peña-Asensio 2025 e integración N cuerpos (docs/reportes/chelyabinsk.md)',
  });

  // ---------- D. Ficha ----------
  if (e.ficha) {
    const ficha = leerFicha(e.ficha.cruda);
    const m = meteoritos.get(ficha.pieza)!;
    const ctx = contextoFicha(m, e.ficha.cneos, e.ficha.nClones);
    for (const k of marcadores(ficha.cuerpo)) {
      const d = ctx[k];
      filas.push({
        seccion: `Ficha: ${ficha.pieza} (${ficha.estado})`,
        elemento: `{{${k}}}`,
        valor: d?.texto ?? '—',
        fuente: d?.fuente ?? '—',
        estado: d && fuentes.has(d.fuente) ? 'verificado' : 'error',
        ...(ficha.estado === 'borrador' && { nota: 'borrador: no se publica en producción' }),
      });
    }
  }

  // ---------- E. Cifras escritas en los textos de la interfaz ----------
  for (const [clave, texto] of Object.entries(e.textos)) {
    const cifras = texto.replace(/\{\w+\}/g, '').match(/\d+/g) ?? [];
    if (!cifras.length) continue;
    const permitido = CIFRAS_PERMITIDAS[clave];
    const ok = permitido && cifras.every((c) => permitido.cifras.includes(c));
    filas.push({
      seccion: 'Cifras en los textos de la interfaz',
      elemento: clave,
      valor: cifras.join(' '),
      fuente: 'src/i18n/es.json',
      estado: ok ? 'convencion' : 'error',
      nota: ok ? permitido.motivo : 'cifra escrita a mano: debe venir del dataset como parámetro',
    });
  }
  const radio = Math.round(e.radioVisualMeteoroideKm / 1e5) * 1e5;
  filas.push({
    seccion: 'Cifras en los textos de la interfaz',
    elemento: 'radio visual del meteoroide',
    valor: `${Math.round(e.radioVisualMeteoroideKm)} km`,
    fuente: 'src/scene/sistema-solar.ts',
    estado: radio === 900_000 ? 'convencion' : 'error',
    nota: 'el texto dice «~900 000 km»',
  });
  return filas;
}

export function informe(filas: Fila[]): string {
  const cuenta = (s: EstadoFila) => filas.filter((f) => f.estado === s).length;
  const celda = (x: string) => x.replace(/\|/g, '\\|');
  const secciones = [...new Set(filas.map((f) => f.seccion))];
  const lineas = [
    '# Auditoría de trazabilidad',
    '',
    'Generado por `npm run auditoria` (también se ejecuta en `npm run build`, que falla si hay',
    'errores). Cada dato que muestra la interfaz se contrasta con su valor de origen en `data/`.',
    '',
    `- Verificados: ${cuenta('verificado')}`,
    `- Pendientes mostrados con aviso: ${cuenta('pendiente-marcado')}`,
    `- Calculados con método documentado: ${cuenta('calculado')}`,
    `- Convenciones visuales o de notación: ${cuenta('convencion')}`,
    `- **Errores: ${cuenta('error')}**`,
    '',
  ];
  for (const s of secciones) {
    lineas.push(
      `## ${s}`,
      '',
      '| Elemento | Valor | Fuente | Estado | Nota |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const f of filas.filter((x) => x.seccion === s))
      lineas.push(
        `| ${celda(f.elemento)} | ${celda(f.valor)} | ${celda(f.fuente)} | ${f.estado} | ${celda(f.nota ?? '')} |`,
      );
    lineas.push('');
  }
  return lineas.join('\n');
}
