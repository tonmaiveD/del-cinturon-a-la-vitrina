/** Renderer, postprocesado (bloom), cámaras y controles de las dos vistas. */
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { HalfFloatType, PerspectiveCamera, type Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export type NombreVista = 'tierra' | 'sistema-solar';

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

  function etiqueta(texto: string, posicion: Vector3, escena: Scene, clase = ''): CSS2DObject {
    const div = document.createElement('div');
    div.className = `etiqueta ${clase}`;
    div.textContent = texto;
    div.setAttribute('aria-hidden', 'true'); // la descripción accesible va en el panel
    const obj = new CSS2DObject(div);
    obj.position.copy(posicion);
    escena.add(obj);
    return obj;
  }

  function ajustar(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    etiquetas.setSize(w, h);
    for (const v of vistas.values()) {
      v.camara.aspect = w / h;
      // En vertical el panel ocupa la parte baja: se desplaza el encuadre hacia arriba
      if (w / h < 0.8) v.camara.setViewOffset(w, h, 0, h * 0.18, w, h);
      else v.camara.clearViewOffset();
      v.camara.updateProjectionMatrix();
      v.composer.setSize(w, h, false);
    }
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

  // Medición de fps (promedio móvil) para verificación de rendimiento
  let fps = 0;
  let ultimo = performance.now();
  renderer.setAnimationLoop(() => {
    const ahora = performance.now();
    fps = fps * 0.95 + (1000 / Math.max(1, ahora - ultimo)) * 0.05;
    ultimo = ahora;
    const v = vistas.get(activa);
    if (!v) return;
    v.controles.update();
    v.alCuadro?.(v.camara);
    v.composer.render();
    etiquetas.render(v.escena, v.camara);
  });

  return { registrar, activar, etiqueta, activa: () => activa, fps: () => fps };
}
