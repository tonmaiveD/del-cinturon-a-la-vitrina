/** Vista geocéntrica: globo orientado según la fecha, atmósfera y trayectoria del bólido. */
import * as Astro from 'astronomy-engine';
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  type Camera,
  Color,
  DirectionalLight,
  AmbientLight,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';
import { ecefAEqj, eqjAEcef, estadoPuntoTerrestre, KM_POR_AU } from '../core/marcos';
import type { Vec3 } from '../core/vector';
import { indiceInferior, interpolar, type Muestra } from '../timeline/interpolacion';
import { aThree } from './coordenadas';
import { RADIO_TIERRA_KM } from './cuerpos';
import { localGlobo, trayectoriaEntradaEcefKm } from './trayectoria-entrada';

export interface DatosBolido {
  fecha: Date;
  latGrados: number;
  lonGrados: number;
  alturaKm: number;
  vEcefKmS: Vec3;
}

const vertexAtmosfera = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;
const fragmentAtmosfera = /* glsl */ `
  uniform vec3 uSol;
  varying vec3 vNormal;
  varying vec3 vPos;
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    vec3 v = normalize(-vPos);
    float borde = pow(1.0 - abs(dot(vNormal, v)), 2.5);
    float dia = clamp(dot(vNormal, uSol) * 0.8 + 0.4, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.35, 0.6, 1.0) * borde * dia * 1.4, borde * dia);
  }
`;

export function crearVistaTierra(
  bolido: DatosBolido,
  /** Texturas de menor a mayor resolución: se muestra la primera y se sustituye al cargar la siguiente. */
  texturasUrl: string[],
  aproximacion: Muestra[],
  radioMeteoroideKm?: number,
) {
  const escena = new Scene();
  escena.background = new Color(0x000000);
  const t = Astro.MakeTime(bolido.fecha);

  // Globo: la geometría de Three ya coincide con ECEF bajo el mapeo (x, z, −y); se orienta con
  // la matriz ECEF → EQJ de cada instante.
  const globo = new Group();
  const m = new Matrix4();
  function orientar(tt: Astro.AstroTime): void {
    const columna = (e: Vec3) => aThree(ecefAEqj(e, tt));
    // Ejes locales de Three (x, y, z) corresponden a ECEF (x, z, −y)
    m.makeBasis(columna([1, 0, 0]), columna([0, 0, 1]), columna([0, -1, 0]));
    globo.setRotationFromMatrix(m);
  }
  orientar(t);
  escena.add(globo);

  const material = new MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  let alCargarPrimera: (() => void) | undefined;
  const primeraCargada = new Promise<void>((r) => (alCargarPrimera = r));
  const cargador = new TextureLoader();
  // Carga en cadena: la de mayor resolución no compite con la inicial por el ancho de banda
  const cargar = (k: number): void => {
    const url = texturasUrl[k];
    if (!url) return;
    cargador.load(url, (tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      material.map?.dispose();
      material.map = tex;
      material.needsUpdate = true;
      if (k === 0) alCargarPrimera?.();
      cargar(k + 1);
    });
  };
  cargar(0);

  const superficie = new Mesh(new SphereGeometry(1, 128, 64), material);
  globo.add(superficie);

  // Luz solar real (dirección geocéntrica del Sol en cada instante)
  const dirSol = new Vector3();
  const luz = new DirectionalLight(0xffffff, 3);
  function iluminar(tt: Astro.AstroTime): void {
    const sol = Astro.GeoVector(Astro.Body.Sun, tt, true);
    dirSol.copy(aThree([sol.x, sol.y, sol.z])).normalize();
    luz.position.copy(dirSol).multiplyScalar(10);
  }
  iluminar(t);
  escena.add(luz, new AmbientLight(0xffffff, 0.04));

  const atmosfera = new Mesh(
    new SphereGeometry(1.025, 96, 48),
    new ShaderMaterial({
      vertexShader: vertexAtmosfera,
      fragmentShader: fragmentAtmosfera,
      uniforms: { uSol: { value: new Vector3() } },
      blending: AdditiveBlending,
      side: BackSide,
      transparent: true,
      depthWrite: false,
    }),
  );
  escena.add(atmosfera);

  // Bólido: punto final (pico de brillo o posición de referencia) y, si se conoce el vector de
  // velocidad, trayectoria de entrada; en ECEF (hijos del globo). Se fijan con fijarBolido().
  const kmAUnidad = 1 / RADIO_TIERRA_KM;
  const trayectoria = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xffc46b }));
  globo.add(trayectoria);

  // Marcador del punto final: exagerado en escala visual
  const marcador = new Mesh(
    new SphereGeometry(1, 16, 8),
    new MeshBasicMaterial({ color: new Color(4, 2.4, 1) }),
  );
  globo.add(marcador);

  const posicionBolido = (): Vector3 => marcador.getWorldPosition(new Vector3());

  // Aproximación final (N-cuerpos, geocéntrica EQJ): línea hasta el instante actual y meteoroide
  let geomAprox = new BufferGeometry();
  const lineaAprox = new Line(
    geomAprox,
    new LineBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.85 }),
  );
  lineaAprox.frustumCulled = false;
  escena.add(lineaAprox);
  const meteoroide = new Mesh(
    new SphereGeometry(1, 12, 6),
    new MeshBasicMaterial({ color: new Color(5, 3, 1.2) }),
  );
  escena.add(meteoroide);

  /** Estado del bólido actual (Chelyabinsk al crear la vista). */
  let fechaRef = bolido.fecha.getTime();
  let aprox: Muestra[] = aproximacion;
  let dtMin = aprox[0]![0];
  let radioMet = radioMeteoroideKm;
  let conEntrada = true;
  /** Los objetos del bólido solo se ven con una pieza que tenga trayectoria. */
  let conBolido = true;
  let ultimaFecha = bolido.fecha;
  let escalaVisual = true;

  /**
   * Fija el bólido que se dibuja. Con `entrada` (vector de velocidad y altura publicados) se
   * dibuja la trayectoria de entrada hasta el pico de brillo; sin ella, solo la aproximación hasta
   * el punto final indicado.
   */
  function fijarBolido(b: {
    fecha: Date;
    aproximacion: Muestra[];
    punto: { latGrados: number; lonGrados: number; alturaKm: number };
    vEcefKmS?: Vec3;
    radioMeteoroideKm?: number;
  }): void {
    fechaRef = b.fecha.getTime();
    aprox = b.aproximacion;
    dtMin = aprox[0]![0];
    radioMet = b.radioMeteoroideKm;
    const tt = Astro.MakeTime(b.fecha);
    if (b.vEcefKmS) {
      const { inicio, pico } = trayectoriaEntradaEcefKm(
        b.punto.latGrados,
        b.punto.lonGrados,
        b.punto.alturaKm,
        b.vEcefKmS,
        tt,
      );
      trayectoria.geometry.dispose();
      trayectoria.geometry = new BufferGeometry().setFromPoints([
        localGlobo(inicio),
        localGlobo(pico),
      ]);
      marcador.position.copy(localGlobo(pico));
      conEntrada = true;
    } else {
      const r = estadoPuntoTerrestre(
        b.punto.latGrados,
        b.punto.lonGrados,
        b.punto.alturaKm * 1000,
        tt,
      ).r;
      marcador.position.copy(localGlobo(eqjAEcef(r, tt).map((c) => c * KM_POR_AU) as Vec3));
      conEntrada = false;
    }
    geomAprox.dispose();
    geomAprox = new BufferGeometry().setFromPoints(
      aprox.map(([, x, y, z]) => aThree([x, y, z], kmAUnidad)),
    );
    lineaAprox.geometry = geomAprox;
    aplicarEscala(escalaVisual);
    actualizarTiempo(ultimaFecha);
  }

  function aplicarEscala(visual: boolean): void {
    escalaVisual = visual;
    // Real: 1 km de radio (aprox. tamaño de la bola de fuego); visual: 60 km para que se vea
    marcador.scale.setScalar((visual ? 60 : 1) * kmAUnidad);
    // Meteoroide: radio real del dataset (si existe); visual: 60 km
    meteoroide.scale.setScalar((visual ? 60 : (radioMet ?? 0.01)) * kmAUnidad);
  }

  /** Coloca globo, Sol y meteoroide en el instante dado. */
  function actualizarTiempo(fecha: Date): void {
    ultimaFecha = fecha;
    const tt = Astro.MakeTime(fecha);
    orientar(tt);
    iluminar(tt);
    const dt = (fecha.getTime() - fechaRef) / 86400000;
    const visible = conBolido && dt >= dtMin && dt <= 0;
    trayectoria.visible = conBolido && conEntrada;
    lineaAprox.visible = visible;
    meteoroide.visible = visible && dt < 0;
    // El pico de brillo se marca desde 1 min antes
    marcador.visible = conBolido && dt >= -1 / 1440;
    if (!visible) return;
    const i = indiceInferior(aprox, dt);
    geomAprox.setDrawRange(0, i + 1);
    meteoroide.position.copy(aThree(interpolar(aprox, dt), kmAUnidad));
  }
  fijarBolido({
    fecha: bolido.fecha,
    aproximacion,
    punto: bolido,
    vEcefKmS: bolido.vEcefKmS,
    radioMeteoroideKm,
  });

  function actualizar(camara: Camera): void {
    // El shader trabaja en espacio de vista: se transforma la dirección del Sol
    const mat = atmosfera.material as ShaderMaterial;
    mat.uniforms.uSol!.value.copy(dirSol).transformDirection(camara.matrixWorldInverse);
  }

  function mostrarBolido(si: boolean): void {
    conBolido = si;
    actualizarTiempo(ultimaFecha);
  }

  return {
    primeraCargada,
    mostrarBolido,
    fijarBolido,
    escena,
    globo,
    marcador,
    meteoroide,
    posicionBolido,
    aplicarEscala,
    actualizar,
    actualizarTiempo,
  };
}
