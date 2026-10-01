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
import { escala, norma, punto, suma, unitario, type Vec3 } from '../core/vector';
import { indiceInferior, interpolar, type Muestra } from '../timeline/interpolacion';
import { aThree } from './coordenadas';
import { RADIO_TIERRA_KM } from './cuerpos';

export interface DatosBolido {
  fecha: Date;
  latGrados: number;
  lonGrados: number;
  alturaKm: number;
  vEcefKmS: Vec3;
}

/** Altura de inicio dibujada para la trayectoria de entrada (km): solo referencia visual. */
const ALTURA_INICIO_KM = 100;

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

  // Bólido: punto del pico de brillo y trayectoria de entrada, en ECEF (hijos del globo)
  const kmAUnidad = 1 / RADIO_TIERRA_KM;
  const p = estadoPuntoTerrestre(bolido.latGrados, bolido.lonGrados, bolido.alturaKm * 1000, t);
  const pEcefKm = escala(eqjAEcef(p.r, t), KM_POR_AU);
  const subida = unitario(escala(bolido.vEcefKmS, -1));
  // Distancia s a lo largo de la subida hasta ALTURA_INICIO_KM sobre el radio local
  const radioLocal = norma(pEcefKm) - bolido.alturaKm;
  const objetivo = radioLocal + ALTURA_INICIO_KM;
  const b = punto(pEcefKm, subida);
  const s = -b + Math.sqrt(b * b - (punto(pEcefKm, pEcefKm) - objetivo * objetivo));
  const inicio = suma(pEcefKm, escala(subida, s));
  const local = (v: Vec3) => new Vector3(v[0] * kmAUnidad, v[2] * kmAUnidad, -v[1] * kmAUnidad);

  const trayectoria = new Line(
    new BufferGeometry().setFromPoints([local(inicio), local(pEcefKm)]),
    new LineBasicMaterial({ color: 0xffc46b }),
  );
  globo.add(trayectoria);

  // Marcador del pico: exagerado en escala visual
  const marcador = new Mesh(
    new SphereGeometry(1, 16, 8),
    new MeshBasicMaterial({ color: new Color(4, 2.4, 1) }),
  );
  marcador.position.copy(local(pEcefKm));
  globo.add(marcador);

  const posicionBolido = (): Vector3 => marcador.getWorldPosition(new Vector3());

  // Aproximación final (N-cuerpos, geocéntrica EQJ): línea hasta el instante actual y meteoroide
  const ptsAprox = aproximacion.map(([, x, y, z]) => aThree([x, y, z], kmAUnidad));
  const geomAprox = new BufferGeometry().setFromPoints(ptsAprox);
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
  const dtMin = aproximacion[0]![0];

  function aplicarEscala(visual: boolean): void {
    // Real: 1 km de radio (aprox. tamaño de la bola de fuego); visual: 60 km para que se vea
    marcador.scale.setScalar((visual ? 60 : 1) * kmAUnidad);
    // Meteoroide: radio real del dataset (si existe); visual: 60 km
    meteoroide.scale.setScalar((visual ? 60 : (radioMeteoroideKm ?? 0.01)) * kmAUnidad);
  }

  /** Coloca globo, Sol y meteoroide en el instante dado. */
  function actualizarTiempo(fecha: Date): void {
    const tt = Astro.MakeTime(fecha);
    orientar(tt);
    iluminar(tt);
    const dt = (fecha.getTime() - bolido.fecha.getTime()) / 86400000;
    const visible = dt >= dtMin && dt <= 0;
    lineaAprox.visible = visible;
    meteoroide.visible = visible && dt < 0;
    marcador.visible = dt >= -1 / 1440; // el pico de brillo se marca desde 1 min antes
    if (!visible) return;
    const i = indiceInferior(aproximacion, dt);
    geomAprox.setDrawRange(0, i + 1);
    meteoroide.position.copy(aThree(interpolar(aproximacion, dt), kmAUnidad));
  }
  aplicarEscala(true);

  function actualizar(camara: Camera): void {
    // El shader trabaja en espacio de vista: se transforma la dirección del Sol
    const mat = atmosfera.material as ShaderMaterial;
    mat.uniforms.uSol!.value.copy(dirSol).transformDirection(camara.matrixWorldInverse);
  }

  return {
    primeraCargada,
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
