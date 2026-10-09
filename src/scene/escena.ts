/** Renderer, postprocesado (bloom), cámaras y controles de las dos vistas. */
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { HalfFloatType, type Object3D, PerspectiveCamera, type Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export type NombreVista = 'tierra' | 'sistema-solar';
export interface AreaLibre {
  arriba: number;
  abajo: number;
  izquierda: number;
  derecha: number;
}

interface Vista {
  escena: Scene;
  camara: PerspectiveCamera;
  controles: OrbitControls;
  composer: EffectComposer;
  alCuadro?: (camara: PerspectiveCamera) => void;
}

export function crearMotor(canvas: HTMLCanvasElement, capaEtiquetas: HTMLElement) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    logarithmicDepthBuffer: true,
    powerPreference: 'high-performance',
  });
  // Móviles: DPR limitado para sostener el objetivo de 30 fps con bloom en GPU de gama media
  const movil = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, movil ? 1.5 : 2));
  const etiquetas = new CSS2DRenderer({ element: capaEtiquetas });

  const vistas = new Map<NombreVista, Vista>();
  let activa: NombreVista = 'tierra';

  function registrar(
    nombre: NombreVista,
    escena: Scene,
    cerca: number,
    lejos: number,
    alCuadro?: Vista['alCuadro'],
  ) {
    const camara = new PerspectiveCamera(45, 1, cerca, lejos);
    const controles = new OrbitControls(camara, canvas);
    controles.enableDamping = true;
    controles.enabled = nombre === activa;
    const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType });
    composer.addPass(new RenderPass(escena, camara));
    composer.addPass(
      new EffectPass(
        camara,
        new BloomEffect({
          luminanceThreshold: 1,
          luminanceSmoothing: 0.2,
          intensity: 1.2,
          mipmapBlur: true,
        }),
        new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
      ),
    );
    vistas.set(nombre, { escena, camara, controles, composer, alCuadro });
    ajustar();
    return { camara, controles };
  }

  /** Etiqueta HTML que sigue a `padre` (se dibuja en su origen local). */
  function etiqueta(texto: string, padre: Object3D, clase = ''): CSS2DObject {
    const div = document.createElement('div');
    div.className = `etiqueta ${clase}`;
    div.textContent = texto;
    div.setAttribute('aria-hidden', 'true'); // la descripción accesible va en el panel
    const obj = new CSS2DObject(div);
    padre.add(obj);
    return obj;
  }

  /** Zona de la ventana que no tapan los paneles (px); null: toda la escena está libre. */
  let areaLibre: () => AreaLibre | null = () => null;

  function ajustar(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    etiquetas.setSize(w, h);
    // El centro de la proyección se lleva al centro de la zona libre (hoja móvil abierta, etc.)
    const a = areaLibre();
    const dx = a ? w / 2 - (a.izquierda + a.derecha) / 2 : 0;
    const dy = a ? h / 2 - (a.arriba + a.abajo) / 2 : 0;
    for (const v of vistas.values()) {
      v.camara.aspect = w / h;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) v.camara.setViewOffset(w, h, dx, dy, w, h);
      else v.camara.clearViewOffset();
      v.camara.updateProjectionMatrix();
      v.composer.setSize(w, h, false);
    }
  }
  function fijarAreaLibre(f: () => AreaLibre | null): void {
    areaLibre = f;
    ajustar();
  }
  window.addEventListener('resize', ajustar);

  function activar(nombre: NombreVista): void {
    activa = nombre;
    for (const [n, v] of vistas) {
      v.controles.enabled = n === nombre;
      // CSS2DRenderer solo actualiza la escena que renderiza: hay que ocultar a mano las demás
      v.escena.traverse((o) => {
        if (o instanceof CSS2DObject) {
          o.visible = n === nombre;
          o.element.style.display = n === nombre ? '' : 'none';
        }
      });
    }
  }

  const ganchos = new Set<(dt: number) => void>();
  /** Registra una función que se ejecuta en cada cuadro con el tiempo real transcurrido (s). */
  function alCuadro(f: (dt: number) => void): void {
    ganchos.add(f);
  }

  // Medición de fps (promedio móvil) para verificación de rendimiento
  let fps = 0;
  let ultimo = performance.now();
  const oyentesContexto = new Set<(perdido: boolean) => void>();
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // permite que el navegador lo restaure
    renderer.setAnimationLoop(null);
    oyentesContexto.forEach((f) => f(true));
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderer.setAnimationLoop(bucle);
    oyentesContexto.forEach((f) => f(false));
  });
  renderer.setAnimationLoop(bucle);
  function bucle(): void {
    const ahora = performance.now();
    const dt = Math.min(0.1, (ahora - ultimo) / 1000);
    fps = fps * 0.95 + (1000 / Math.max(1, ahora - ultimo)) * 0.05;
    ultimo = ahora;
    ganchos.forEach((f) => f(dt));
    const v = vistas.get(activa);
    if (!v) return;
    v.controles.update();
    v.alCuadro?.(v.camara);
    v.composer.render();
    etiquetas.render(v.escena, v.camara);
  }

  const vista = (n: NombreVista) => vistas.get(n)!;
  return {
    registrar,
    activar,
    etiqueta,
    alCuadro,
    vista,
    ajustar,
    fijarAreaLibre,
    alContexto: (f: (perdido: boolean) => void) => oyentesContexto.add(f),
    activa: () => activa,
    fps: () => fps,
  };
}
