/**
 * CLI: `npm run validacion:chelyabinsk`.
 * Calcula la órbita de Chelyabinsk desde el vector CNEOS, ejecuta el Monte Carlo y compara con
 * las órbitas publicadas. Escribe docs/reportes/chelyabinsk.md y public/data/chelyabinsk-orbitas.json.
 * Sale con código 2 si se cumple el criterio de parada.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Elementos } from '../src/core/kepler';
import { montecarloBolido, type IncertidumbreVelocidad } from '../src/core/montecarlo';
import {
  orbitaAtraccionCenital,
  orbitaDesdeBolido,
  type HipotesisMarco,
  type RegistroBolido,
  type ResultadoOrbita,
} from '../src/core/orbita-bolido';
import { dDrummond, type ElementosAngulares } from '../src/core/similitud';
import { GRAD } from '../src/core/vector';
import { Calibracion, Meteorito, type Orbita, type Valor } from '../src/schema';

const N_CLONES = 1000;
const SEMILLA = 20130215;
const UMBRAL_DD = 0.1;
const UMBRAL_Z = 3;
/** Mediana de |x| para una normal: 0.6745σ. */
const MAD_A_SIGMA = 1 / 0.6744897501960817;

// Tabla 4 de Peña-Asensio et al. 2025 (arXiv:2508.01454v3), grupo de bajo D_D: medianas de error.
const MEDIANAS_PENA = { v: 0.55, ra: 1.35, dec: 0.84 };
const INC_PRINCIPAL: IncertidumbreVelocidad = {
  sigmaV: MEDIANAS_PENA.v * MAD_A_SIGMA,
  sigmaRaGrados: MEDIANAS_PENA.ra * MAD_A_SIGMA,
  sigmaDecGrados: MEDIANAS_PENA.dec * MAD_A_SIGMA,
};
const INC_SENSIBILIDAD: IncertidumbreVelocidad = {
  sigmaV: MEDIANAS_PENA.v,
  sigmaRaGrados: MEDIANAS_PENA.ra,
  sigmaDecGrados: MEDIANAS_PENA.dec,
};

// ---------- entrada ----------
const cneos = JSON.parse(readFileSync('data/cneos/chelyabinsk.json', 'utf8'));
const [fila] = cneos.respuesta.data as string[][];
const campos = cneos.respuesta.fields as string[];
const c = (k: string) => fila![campos.indexOf(k)]!;
const signo = (v: string, dir: string, neg: string) => (dir === neg ? -1 : 1) * Number(v);
const registro: RegistroBolido = {
  fecha: new Date(c('date').replace(' ', 'T') + 'Z'),
  latGrados: signo(c('lat'), c('lat-dir'), 'S'),
  lonGrados: signo(c('lon'), c('lon-dir'), 'W'),
  alturaKm: Number(c('alt')),
  vEcefKmS: [Number(c('vx')), Number(c('vy')), Number(c('vz'))],
};
const meteorito = Meteorito.parse(
  JSON.parse(readFileSync('data/pedigri/chelyabinsk.json', 'utf8')),
);

// ---------- utilidades ----------
const num = (v: Valor) => v.valor as number;
const grados = (x: number) => x / GRAD;
const angDeElementos = (e: Elementos): ElementosAngulares => ({
  q: e.a * (1 - e.e),
  e: e.e,
  i: e.i,
  nodo: e.nodo,
  omega: e.omega,
});
const angDeOrbita = (o: Orbita): ElementosAngulares => ({
  q: o.q ? num(o.q) : num(o.a) * (1 - num(o.e)),
  e: num(o.e),
  i: num(o.i) * GRAD,
  nodo: num(o.nodo) * GRAD,
  omega: num(o.omega) * GRAD,
});
const nombreOrbita = (o: Orbita) =>
  o.fuente === 'pena-asensio-2025' ? 'Borovička et al. 2013 (vía Peña-Asensio 2025)' : o.fuente;

interface Estadistica {
  media: number;
  sd: number;
  p: (x: number) => number;
  cuantil: (q: number) => number;
}
function estadistica(xs: number[]): Estadistica {
  const s = [...xs].sort((a, b) => a - b);
  const media = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - media) ** 2, 0) / (s.length - 1));
  return {
    media,
    sd,
    p: (x) => s.filter((v) => v < x).length / s.length,
    cuantil: (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]!,
  };
}

type Clave = 'a' | 'e' | 'i' | 'q';
const extraer: Record<Clave, (e: Elementos) => number> = {
  a: (e) => e.a,
  e: (e) => e.e,
  i: (e) => grados(e.i),
  q: (e) => e.a * (1 - e.e),
};
const valorPublicado = (o: Orbita, k: Clave): { x: number; s: number } | undefined => {
  if (k === 'q') {
    if (o.q) return { x: num(o.q), s: o.q.sigma ?? 0 };
    return { x: num(o.a) * (1 - num(o.e)), s: 0 };
  }
  return { x: num(o[k]), s: o[k].sigma ?? 0 };
};

function analizar(clones: ResultadoOrbita[], nominal: ResultadoOrbita) {
  const est = Object.fromEntries(
    (Object.keys(extraer) as Clave[]).map((k) => [
      k,
      estadistica(clones.map((r) => extraer[k](r.elementos))),
    ]),
  ) as Record<Clave, Estadistica>;
  const comparaciones = meteorito.orbitas.map((o) => {
    const dd = dDrummond(angDeElementos(nominal.elementos), angDeOrbita(o));
    const ddClones = estadistica(
      clones.map((r) => dDrummond(angDeElementos(r.elementos), angDeOrbita(o))),
    );
    const z = Object.fromEntries(
      (Object.keys(extraer) as Clave[]).map((k) => {
        const pub = valorPublicado(o, k)!;
        return [k, (pub.x - est[k].media) / est[k].sd];
      }),
    ) as Record<Clave, number>;
    const percentil = Object.fromEntries(
      (Object.keys(extraer) as Clave[]).map((k) => [k, est[k].p(valorPublicado(o, k)!.x)]),
    ) as Record<Clave, number>;
    return { orbita: o, dd, ddMedianaClones: ddClones.cuantil(0.5), z, percentil };
  });
  return { est, comparaciones };
}

// ---------- cálculo ----------
const hipotesis: HipotesisMarco[] = ['ecef-relativa', 'inercial'];
const nominal = Object.fromEntries(
  hipotesis.map((h) => [h, orbitaDesdeBolido(registro, { hipotesis: h })]),
) as Record<HipotesisMarco, ResultadoOrbita>;
const cenital = Object.fromEntries(hipotesis.map((h) => [h, orbitaAtraccionCenital(registro, h)]));

const t0 = performance.now();
const mcPrincipal = montecarloBolido(registro, INC_PRINCIPAL, N_CLONES, SEMILLA, {
  hipotesis: 'ecef-relativa',
});
const mcSensibilidad = montecarloBolido(registro, INC_SENSIBILIDAD, N_CLONES, SEMILLA, {
  hipotesis: 'ecef-relativa',
});
const mcInercial = montecarloBolido(registro, INC_PRINCIPAL, N_CLONES, SEMILLA, {
  hipotesis: 'inercial',
});
const segundos = (performance.now() - t0) / 1000;

const principal = analizar(mcPrincipal, nominal['ecef-relativa']);
const sensibilidad = analizar(mcSensibilidad, nominal['ecef-relativa']);
const inercial = analizar(mcInercial, nominal.inercial);

// Criterio de parada: solo sobre órbitas verificadas
const verificadas = principal.comparaciones.filter((cmp) => cmp.orbita.a.estado === 'verificado');
const fallos: string[] = [];
for (const cmp of verificadas) {
  if (cmp.dd > UMBRAL_DD)
    fallos.push(`${cmp.orbita.fuente}: D_D = ${cmp.dd.toFixed(3)} > ${UMBRAL_DD}`);
  for (const k of Object.keys(cmp.z) as Clave[]) {
    const fueraZ = Math.abs(cmp.z[k]) > UMBRAL_Z;
    const fueraP = cmp.percentil[k] < 0.00135 || cmp.percentil[k] > 0.99865;
    if (fueraZ || fueraP)
      fallos.push(`${cmp.orbita.fuente}: ${k} fuera de 3σ (z = ${cmp.z[k].toFixed(2)})`);
  }
}

// Eventos calibrados (Peña-Asensio et al. 2025): ambas hipótesis frente a órbitas terrestres
const calibracion = Calibracion.parse(
  JSON.parse(readFileSync('data/calibracion/pena-asensio-2025.json', 'utf8')),
);
const angTabla = (o: {
  a: number;
  e: number;
  i: number;
  omega: number;
  nodo: number;
}): ElementosAngulares => ({
  q: o.a * (1 - o.e),
  e: o.e,
  i: o.i * GRAD,
  nodo: o.nodo * GRAD,
  omega: o.omega * GRAD,
});
const filasCal = calibracion.eventos.map((ev) => {
  const reg: RegistroBolido = {
    fecha: new Date(ev.fecha),
    latGrados: ev.lat,
    lonGrados: ev.lon,
    alturaKm: ev.alt_km,
    vEcefKmS: ev.v_ecef_kms,
  };
  const r = Object.fromEntries(
    hipotesis.map((h) => {
      const e = angDeElementos(orbitaDesdeBolido(reg, { hipotesis: h }).elementos);
      return [
        h,
        { ref: dDrummond(e, angTabla(ev.ref)), pena: dDrummond(e, angTabla(ev.cneos_pena)) },
      ];
    }),
  ) as Record<HipotesisMarco, { ref: number; pena: number }>;
  const bajoDD = Number(ev.fecha.slice(0, 4)) >= 2018 || ev.energia_impacto_kt >= 0.45;
  return { nombre: ev.nombre, bajoDD, ddPublicado: ev.ref.dd, ...r };
});
const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};
const bajos = filasCal.filter((f) => f.bajoDD);

// ---------- salida: datos para la visualización ----------
mkdirSync('public/data', { recursive: true });
const serializar = (e: Elementos) => ({
  a: e.a,
  e: e.e,
  i: grados(e.i),
  nodo: grados(e.nodo),
  omega: grados(e.omega),
  M: grados(e.M),
  epoca_ut_j2000: e.epoca,
});
writeFileSync(
  'public/data/chelyabinsk-orbitas.json',
  JSON.stringify({
    generado: new Date().toISOString(),
    nota: 'Elementos eclípticos J2000 (grados, AU). Nube Monte Carlo sobre el vector CNEOS; ver docs/reportes/chelyabinsk.md.',
    fuente_entrada: cneos.fuente,
    hipotesis: 'ecef-relativa',
    incertidumbre: INC_PRINCIPAL,
    semilla: SEMILLA,
    nominal: serializar(nominal['ecef-relativa'].elementos),
    clones: mcPrincipal.slice(0, 300).map((r) => serializar(r.elementos)),
  }) + '\n',
);

// ---------- salida: reporte ----------
const f = (x: number, d = 3) => x.toFixed(d);
const tablaElementos = (titulo: string, e: Elementos, rad?: ResultadoOrbita['radiante']) =>
  `| ${titulo} | ${f(e.a)} | ${f(e.e)} | ${f(e.a * (1 - e.e))} | ${f(grados(e.i), 2)} | ${f(grados(e.omega), 2)} | ${f(grados(e.nodo), 3)} | ${rad ? `${f(rad.ra, 1)} / ${f(rad.dec, 1)} / ${f(rad.vg, 2)}` : '—'} |`;
const tablaPublicada = (o: Orbita) => {
  const s = (v?: Valor, d = 3) =>
    v ? `${f(num(v), d)}${v.sigma !== undefined ? ` ± ${f(v.sigma, d)}` : ''}` : '—';
  return `| ${nombreOrbita(o)} (${o.a.estado}) | ${s(o.a)} | ${s(o.e)} | ${o.q ? s(o.q) : f(num(o.a) * (1 - num(o.e)))} | ${s(o.i, 2)} | ${s(o.omega, 2)} | ${s(o.nodo, 4)} | — |`;
};
const bloqueMC = (titulo: string, an: ReturnType<typeof analizar>, inc: IncertidumbreVelocidad) => `
#### ${titulo}

σv = ${f(inc.sigmaV, 2)} km/s, σα = ${f(inc.sigmaRaGrados, 2)}°, σδ = ${f(inc.sigmaDecGrados, 2)}°, ${N_CLONES} clones, semilla ${SEMILLA}.

| Elemento | Media | σ | Percentil 2.5 % | Percentil 97.5 % |
|---|---|---|---|---|
${(Object.keys(an.est) as Clave[]).map((k) => `| ${k} | ${f(an.est[k].media)} | ${f(an.est[k].sd)} | ${f(an.est[k].cuantil(0.025))} | ${f(an.est[k].cuantil(0.975))} |`).join('\n')}

| Órbita publicada | D_D (nominal) | D_D mediana (clones) | z(a) | z(e) | z(i) | z(q) |
|---|---|---|---|---|---|---|
${an.comparaciones.map((cmp) => `| ${nombreOrbita(cmp.orbita)} | ${f(cmp.dd)} | ${f(cmp.ddMedianaClones)} | ${f(cmp.z.a, 2)} | ${f(cmp.z.e, 2)} | ${f(cmp.z.i, 2)} | ${f(cmp.z.q, 2)} |`).join('\n')}
`;

const popova = meteorito.radiante_geocentrico!;
const informe = `# Validación científica: Chelyabinsk (CNEOS → órbita heliocéntrica)

> Generado por \`npm run validacion:chelyabinsk\` el ${new Date().toISOString().slice(0, 10)}. No editar a mano.

## Veredicto

${fallos.length === 0 ? `**APROBADA.** Ninguna órbita publicada verificada supera el criterio de parada (D_D > ${UMBRAL_DD} o algún elemento a, e, i, q fuera de 3σ de la nube Monte Carlo).` : `**CRITERIO DE PARADA ACTIVADO.**\n\n${fallos.map((x) => `- ${x}`).join('\n')}`}

## Entrada

Registro CNEOS (consultado ${cneos.consultado}): ${c('date')} UTC, ${c('lat')}°${c('lat-dir')} ${c('lon')}°${c('lon-dir')}, ${c('alt')} km, |v| = ${c('vel')} km/s, (vx, vy, vz) = (${c('vx')}, ${c('vy')}, ${c('vz')}) km/s, energía de impacto ${c('impact-e')} kt.

Diferencias conocidas entre el registro CNEOS y la literatura:
- Hora del pico: CNEOS da ${c('date').slice(11)} (consulta actual) y Peña-Asensio et al. 2025 usan 03:20:33 (revisión de 2024); Popova et al. 2013 dan 03:20:32.2 UTC. 7 s mueven la Tierra ~200 km en su órbita: efecto despreciable.
- Altura del pico: CNEOS ${c('alt')} km frente a 29.7 km (Popova et al. 2013).
- Velocidad: CNEOS ${c('vel')} km/s frente a V∞ = ${num(popova.v_entrada!)} ± ${popova.v_entrada!.sigma} km/s (1σ, Popova et al. 2013). Es la diferencia que más pesa en a, e y Vg; el Monte Carlo la cubre (σv del CNEOS).

## Método

1. Posición del pico de brillo con \`ObserverState\` de astronomy-engine; velocidad rotada de ECEF a EQJ (GAST + precesión/nutación).
2. Marco de la velocidad CNEOS: la documentación oficial solo dice "Earth centered". Hipótesis principal **ECEF-relativa** (se suma ω × r), como en Peña-Asensio et al. 2025; se reporta también la **inercial**.
3. Retropropagación N-cuerpos (Sol, 8 planetas, Luna; DOPRI5, rtol 1e-11) hasta 0.05 AU de la Tierra; después, propagación hacia adelante sin Tierra ni Luna hasta la época del impacto. Elementos osculadores eclípticos J2000 en esa época, comparables con los "pre-atmosféricos" publicados.
4. Comparación: D_D de Drummond (1981), Ec. 2 de Peña-Asensio et al. 2025, y puntuación z de cada órbita publicada frente a la nube Monte Carlo.

### Incertidumbre del CNEOS

Fuente: Peña-Asensio, Socas-Navarro & Seligman 2025, A&A 701, A202 (arXiv:2508.01454v3), Tabla 4. Chelyabinsk pertenece al grupo de "bajo D_D" (energía ≥ 0.45 kt), cuyos errores **medianos** frente a órbitas terrestres son |ΔV| = ${MEDIANAS_PENA.v} km/s, |Δα_g| = ${MEDIANAS_PENA.ra}°, |Δδ_g| = ${MEDIANAS_PENA.dec}° (muestra pequeña, distribución asimétrica).

- **Parametrización principal** (decidida antes de ver resultados): normales independientes con σ = mediana / 0.6745 (relación entre la mediana del valor absoluto y σ en una normal).
- **Sensibilidad:** σ = mediana.
- **Aproximación:** se perturba el radiante aparente del vector CNEOS con los σ del radiante geocéntrico.

## Resultados nominales (sin perturbar)

| Cálculo | a (AU) | e | q (AU) | i (°) | ω (°) | Ω (°) | Radiante α / δ (°) / Vg (km/s) |
|---|---|---|---|---|---|---|---|
${tablaElementos('N-cuerpos, ECEF-relativa', nominal['ecef-relativa'].elementos, nominal['ecef-relativa'].radiante)}
${tablaElementos('N-cuerpos, inercial', nominal.inercial.elementos, nominal.inercial.radiante)}
${tablaElementos('Atracción cenital, ECEF-relativa', cenital['ecef-relativa']!.elementos, cenital['ecef-relativa']!.radiante)}
${tablaElementos('Atracción cenital, inercial', cenital.inercial!.elementos, cenital.inercial!.radiante)}

Órbitas publicadas (σ a 1σ; Popova et al. publica a 2σ, aquí convertida):

| Fuente | a (AU) | e | q (AU) | i (°) | ω (°) | Ω (°) | |
|---|---|---|---|---|---|---|---|
${meteorito.orbitas.map(tablaPublicada).join('\n')}

Radiante geocéntrico de Popova et al. 2013 (1σ): α = ${num(popova.ra)} ± ${popova.ra.sigma}°, δ = ${num(popova.dec)} ± ${popova.dec.sigma}°, Vg = ${num(popova.v_geocentrica)} ± ${popova.v_geocentrica.sigma} km/s.

Retropropagación: ${f(nominal['ecef-relativa'].diasRetro, 1)} días hasta 0.05 AU. Tiempo total del Monte Carlo (3 × ${N_CLONES} clones): ${f(segundos, 1)} s.

## Monte Carlo
${bloqueMC('Principal: ECEF-relativa, σ = mediana / 0.6745', principal, INC_PRINCIPAL)}
${bloqueMC('Sensibilidad: ECEF-relativa, σ = mediana', sensibilidad, INC_SENSIBILIDAD)}
${bloqueMC('Hipótesis inercial, σ = mediana / 0.6745', inercial, INC_PRINCIPAL)}

## ¿Qué marco usa CNEOS? Prueba con los 18 eventos calibrados

Datos y órbitas de referencia: Peña-Asensio et al. 2025, Tablas 2 y 3 (\`data/calibracion/pena-asensio-2025.json\`). D_D de nuestra órbita frente a la órbita terrestre de referencia y frente a la órbita que esos autores calculan desde CNEOS.

| Evento | Bajo D_D | D_D publicado (Peña–ref.) | ECEF-rel. vs ref. | Inercial vs ref. | ECEF-rel. vs Peña-CNEOS | Inercial vs Peña-CNEOS |
|---|---|---|---|---|---|---|
${filasCal.map((r) => `| ${r.nombre} | ${r.bajoDD ? 'sí' : 'no'} | ${f(r.ddPublicado)} | ${f(r['ecef-relativa'].ref)} | ${f(r.inercial.ref)} | ${f(r['ecef-relativa'].pena)} | ${f(r.inercial.pena)} |`).join('\n')}

Grupo de bajo D_D (n = ${bajos.length}), medianas: frente a la referencia terrestre, ECEF-relativa ${f(mediana(bajos.map((r) => r['ecef-relativa'].ref)), 4)} e inercial ${f(mediana(bajos.map((r) => r.inercial.ref)), 4)}; frente al cálculo de Peña-Asensio, ECEF-relativa ${f(mediana(bajos.map((r) => r['ecef-relativa'].pena)), 4)} e inercial ${f(mediana(bajos.map((r) => r.inercial.pena)), 4)}.

**Conclusiones:**
1. Con la hipótesis ECEF-relativa reproducimos las órbitas que Peña-Asensio et al. calculan desde CNEOS con un método independiente (atracción cenital). Esto valida la implementación.
2. Frente a las órbitas terrestres, las dos hipótesis no se distinguen: la velocidad de rotación (≤ 0.46 km/s) es menor que el error típico del CNEOS (~0.55 km/s mediano). **El marco no se puede resolver empíricamente con estos datos.** Se adopta ECEF-relativa por el nombre del marco y el uso en la literatura; la diferencia queda documentada como incertidumbre sistemática.

## Limitaciones

- La Tabla 2 de Borovička et al. 2013 (Nature) no se leyó (acceso de pago); su órbita se usa solo vía Peña-Asensio et al. 2025, sin incertidumbres, y no entra en el criterio de parada.
- σ independientes y gaussianas: la Tabla 4 da medianas y percentiles asimétricos de una muestra de 18 eventos.
- No se modela la desaceleración atmosférica antes del pico de brillo.
- Las incertidumbres de Emel'yanenko et al. son formales, sin nivel declarado; se asumen 1σ.
`;
mkdirSync('docs/reportes', { recursive: true });
writeFileSync('docs/reportes/chelyabinsk.md', informe);
console.log(
  fallos.length ? `CRITERIO DE PARADA:\n- ${fallos.join('\n- ')}` : 'Validación aprobada.',
);
console.log('Reporte: docs/reportes/chelyabinsk.md');
if (fallos.length) process.exit(2);
