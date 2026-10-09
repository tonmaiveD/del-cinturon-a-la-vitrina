/**
 * Auditoría de trazabilidad: recorre lo que muestra la interfaz y comprueba, dato por dato, que
 * coincide con un valor «verificado» del dataset con fuente de metadatos verificados, o que es un
 * cálculo documentado o una convención visual declarada. Lo pendiente solo puede aparecer marcado.
 * Además, ninguna cifra puede estar escrita a mano en los textos de la interfaz salvo las de la
 * lista de convenciones (con su motivo).
 */
import { semiejeResonancia } from '../src/core/resonancias';
import { CORTE_FECHA, leerEventos, UMBRAL_KT } from '../src/cneos/eventos';
import type { OrbitaCneos, ResumenCneos } from '../src/cneos/resumen';
import type { TrayectoriaPieza } from './trayectorias-pedigri';
import type { CalidadCneos, RespuestaCneos } from '../src/schema';
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
  'app.estado': { cifras: ['3'], motivo: 'número de fase del proyecto' },
  'escena.descripcion': { cifras: ['3'], motivo: 'nombre del tipo de visualización («3D»)' },
  'error.webgl': { cifras: ['3'], motivo: 'nombre del tipo de visualización («3D»)' },
  'error.contexto': { cifras: ['3'], motivo: 'nombre del tipo de visualización («3D»)' },
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
  'cneos.evento.energia': {
    cifras: ['10'],
    motivo: 'unidad en que la API publica la energía radiada (10¹⁰ J)',
  },
  'cneos.orbita.calculada': {
    cifras: ['68', '16', '84'],
    motivo: 'definición del rango mostrado (percentiles 16 y 84 de la nube)',
  },
  'cneos.orbita.hiperbolicas': {
    cifras: ['1'],
    motivo: 'definición de órbita hiperbólica (excentricidad ≥ 1)',
  },
  'cneos.orbita.metodo': { cifras: ['2025'], motivo: 'año de la cita (Peña-Asensio et al. 2025)' },
  'cneos.orbita.no-verificable': {
    cifras: ['2025'],
    motivo: 'año de la cita (Peña-Asensio et al. 2025)',
  },
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
  /** Trayectorias animadas de las piezas con pedigrí (índice y lector de archivos). */
  trayectorias?: {
    indice: string[];
    leer: (id: string) => TrayectoriaPieza;
    alturaConvencionalKm: number;
    /** Vectores de estado de JPL guardados (data/verificacion/originales.json), por pieza. */
    vectoresJpl?: Record<
      string,
      { jd_tdb: number; x: number; y: number; z: number; vx: number; vy: number; vz: number }
    >;
  };
  /** Modo CNEOS: respuesta cruda, resumen publicado, Tabla 4 y lector de archivos de órbita. */
  bolidos?: {
    crudo: RespuestaCneos;
    resumen: ResumenCneos;
    tabla4: CalidadCneos;
    leerOrbita: (id: string) => OrbitaCneos;
  };
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

  // ---------- G. Trayectorias animadas de las piezas ----------
  if (e.trayectorias) {
    const { indice, leer, alturaConvencionalKm, vectoresJpl } = e.trayectorias;
    for (const id of indice) {
      const m = meteoritos.get(id);
      const tr = leer(id);
      const fallos: string[] = [];
      if (!m) fallos.push('pieza inexistente en el dataset');
      else if (Date.parse(tr.instante_referencia) !== Date.parse(String(m.fecha_caida.valor)))
        fallos.push('instante distinto del dataset');
      let nota: string;
      if (tr.origen === 'jpl') {
        const v = vectoresJpl?.[id];
        const guardado = tr.estado_jpl?.vector_geocentrico;
        if (
          !v ||
          !guardado ||
          v.jd_tdb !== tr.estado_jpl!.jd_tdb ||
          JSON.stringify([v.x, v.y, v.z, v.vx, v.vy, v.vz]) !== JSON.stringify(guardado)
        )
          fallos.push('el estado inicial no coincide con el vector de JPL guardado');
        if (tr.validacion.criterio !== 'solo-dd' || tr.validacion.fuente_orbita !== 'jpl-horizons')
          fallos.push('criterio de validación no documentado para JPL');
        nota = `estado de JPL (data/verificacion/originales.json); criterio solo D_D (σ formal de JPL menor que la precisión de las efemérides; decisión del 2026-10-08), declarado en pantalla`;
      } else {
        const r = m?.radiante_geocentrico;
        const pt = m?.punto_trayectoria;
        const rad = tr.radiante;
        if (!r || !pt || !rad) fallos.push('pieza sin radiante o posición en el dataset');
        else {
          if (rad.ra !== r.ra.valor || rad.dec !== r.dec.valor)
            fallos.push('radiante distinto del dataset');
          if (rad.vg !== r.v_geocentrica.valor) fallos.push('v_g distinta del dataset');
          if (![r.ra, r.dec, r.v_geocentrica].every((x) => x.estado === 'verificado'))
            fallos.push('radiante o v_g sin verificar');
          if (tr.punto.lat !== pt.lat.valor || tr.punto.lon !== pt.lon.valor)
            fallos.push('posición distinta del dataset');
        }
        if (!tr.punto.altura_convencional || tr.punto.altura_km !== alturaConvencionalKm)
          fallos.push('altura no declarada como convencional');
        if (tr.validacion.criterio !== 'dd-y-z') fallos.push('criterio de validación relajado');
        nota = `radiante, v_g, posición e instante del dataset; altura convencional de ${alturaConvencionalKm} km declarada`;
      }
      if (!tr.validacion.aprobada) fallos.push('no supera el criterio de parada');
      filas.push({
        seccion: 'Trayectorias animadas (piezas con pedigrí)',
        elemento: id,
        valor: `D_D ${tr.validacion.dd} frente a ${tr.validacion.fuente_orbita}`,
        fuente:
          tr.origen === 'jpl'
            ? 'cálculo propio desde el estado de jpl-horizons'
            : `cálculo propio desde ${tr.radiante?.fuente ?? '—'}`,
        estado: fallos.length ? 'error' : 'calculado',
        nota: fallos.length ? fallos.join('; ') : nota,
      });
    }
  }

  // ---------- F. Bólidos del CNEOS ----------
  if (e.bolidos) {
    const { crudo, resumen, tabla4, leerOrbita } = e.bolidos;
    const s = 'Bólidos del CNEOS (modo CNEOS)';
    const fila = (
      elemento: string,
      valor: string,
      ok: boolean,
      nota: string,
      fuente = crudo.fuente,
    ) =>
      filas.push({
        seccion: s,
        elemento,
        valor,
        fuente,
        estado: ok ? 'verificado' : 'error',
        nota,
      });
    const leidos = leerEventos(crudo.respuesta);
    const publicados = resumen.eventos.map((x) =>
      Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'orbita')),
    );
    fila(
      'eventos mostrados (fecha, posición, altura, velocidad, energías, calidad)',
      `${resumen.eventos.length} eventos`,
      JSON.stringify(publicados) === JSON.stringify(leidos),
      'el resumen publicado coincide campo a campo con la respuesta cruda guardada',
    );
    fila(
      'fecha de «última actualización»',
      resumen.consultado,
      resumen.consultado === crudo.consultado,
      'es la fecha de la consulta guardada con la respuesta cruda (nunca «en vivo»)',
    );
    const alto = tabla4.grupos.find((g) => g.id === 'alto-dd')!;
    fila(
      'criterio de «órbita no verificable» y errores mostrados',
      `año < ${resumen.criterio.corte_fecha.slice(0, 4)} y < ${resumen.criterio.umbral_kt} kt`,
      resumen.criterio.corte_fecha === CORTE_FECHA &&
        resumen.criterio.umbral_kt === UMBRAL_KT &&
        JSON.stringify(resumen.criterio.alto_dd) === JSON.stringify(alto),
      'coincide con la Tabla 4 guardada (data/calibracion/pena-asensio-2025-tabla4.json)',
      tabla4.fuente,
    );
    const bajo = tabla4.grupos.find((g) => g.id === 'bajo-dd')!;
    let malos = 0;
    let conNube = 0;
    for (const ev of resumen.eventos.filter((x) => x.calidad === 'orbita')) {
      const o = leerOrbita(ev.id);
      const r = ev.orbita;
      if ('error' in o) {
        if (!r || !('error' in r) || r.error !== o.error) malos++;
        continue;
      }
      conNube++;
      const sigmaOk =
        Math.abs(o.metodo.sigma.v_kms - bajo.v_kms.mediana / 0.6744897501960817) < 1e-3 &&
        Math.abs(o.metodo.sigma.alfa_grados - bajo.alfa_g_grados.mediana / 0.6744897501960817) <
          1e-3 &&
        Math.abs(o.metodo.sigma.delta_grados - bajo.delta_g_grados.mediana / 0.6744897501960817) <
          1e-3;
      const resumenOk =
        !!r &&
        !('error' in r) &&
        r.n === o.clones.length &&
        r.descartados === o.metodo.clones_fallidos &&
        JSON.stringify(r.radiante) === JSON.stringify(o.radiante);
      if (!sigmaOk || !resumenOk) malos++;
    }
    filas.push({
      seccion: s,
      elemento: 'órbitas y nubes calculadas',
      valor: `${conNube} nubes`,
      fuente: `cálculo propio; σ de ${tabla4.fuente}`,
      estado: malos === 0 ? 'calculado' : 'error',
      nota:
        malos === 0
          ? 'σ = mediana de la Tabla 4 / 0,6745 en todas; el resumen mostrado coincide con cada archivo'
          : `${malos} órbitas no coinciden con su archivo o con la σ de la Tabla 4`,
    });
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
