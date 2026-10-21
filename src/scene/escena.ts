/**
 * Renderer, postprocesado (bloom), cámaras y controles de las dos vistas.
 *
 * Dibujo bajo demanda (M14): el bucle corre en cada cuadro del navegador, pero solo dibuja si
 * algo cambió (cámara o su inercia, reloj, recorrido, interfaz: `invalidar`). En reposo dibuja
 * un cuadro por segundo como red de seguridad, por si algún cambio no avisó. Con la pestaña
 * oculta el bucle se detiene.
 *
 * Modo económico (M13): resolución 1:1 y sin el efecto de brillo (bloom), con la misma
 * información científica. Se elige a mano o se activa solo si la escena va lenta.
 */
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import {
  ACESFilmicToneMapping,
  HalfFloatType,
  NoToneMapping,
  type Object3D,
  PerspectiveCamera,
  type Scene,
  WebGLRenderer,
} from 'three';
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
  const dprNormal = Math.min(window.devicePixelRatio, movil ? 1.5 : 2);
  renderer.setPixelRatio(dprNormal);
  let economico = false;
  const etiquetas = new CSS2DRenderer({ element: capaEtiquetas });

  const vistas = new Map<NombreVista, Vista>();
  let activa: NombreVista = 'tierra';
  /** Último tamaño del lienzo con el que se dimensionaron los búferes («ancho×alto»). */
  let tamano = '';

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
    controles.addEventListener('change', () => invalidar());
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
    tamano = ''; // vista nueva: sus búferes se dimensionan una vez
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
    // Los búferes (render y postprocesado) solo se recrean si cambia el tamaño del lienzo; un
    // cambio de la zona libre (la hoja móvil sube o baja) solo mueve el encuadre.
    const nuevoTamano = `${w}x${h}`;
    const cambiaTamano = nuevoTamano !== tamano;
    tamano = nuevoTamano;
    if (cambiaTamano) {
      renderer.setSize(w, h, false);
      etiquetas.setSize(w, h);
    }
    // El centro de la proyección se lleva al centro de la zona libre (hoja móvil abierta, etc.)
    const a = areaLibre();
    const dx = a ? w / 2 - (a.izquierda + a.derecha) / 2 : 0;
    const dy = a ? h / 2 - (a.arriba + a.abajo) / 2 : 0;
    for (const v of vistas.values()) {
      v.camara.aspect = w / h;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) v.camara.setViewOffset(w, h, dx, dy, w, h);
      else v.camara.clearViewOffset();
      v.camara.updateProjectionMatrix();
      if (cambiaTamano) v.composer.setSize(w, h, false);
    }
  }
  function fijarAreaLibre(f: () => AreaLibre | null): void {
    areaLibre = f;
    ajustar();
  }
  window.addEventListener('resize', () => {
    ajustar();
    invalidar();
  });

  function activar(nombre: NombreVista): void {
    activa = nombre;
    invalidar();
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

  // ---------- Dibujo bajo demanda ----------
  /** Instante (performance.now) hasta el que se dibuja a ritmo completo. */
  let activoHasta = 0;
  const RED_DE_SEGURIDAD_MS = 1000;
  /** Cuadros que se dibujan seguro tras un aviso, aunque el navegador estuviera ocupado. */
  let cuadrosPendientes = 0;
  /** Pide dibujar durante `ms` (por defecto, el tiempo de una transición corta). */
  function invalidar(ms = 400): void {
    activoHasta = Math.max(activoHasta, performance.now() + ms);
    cuadrosPendientes = Math.max(cuadrosPendientes, 3);
  }
  // Cualquier interacción con la página puede cambiar lo que se ve
  for (const ev of ['pointerdown', 'pointerup', 'wheel', 'keydown', 'touchstart'])
    window.addEventListener(ev, () => invalidar(), { passive: true });
  let ultimoDibujo = 0;
  let dibujados = 0;

  // Medición de fps (promedio móvil de los cuadros dibujados a ritmo completo)
  let fps = 0;
  let ultimo = performance.now();
  let ultimoActivo = 0;
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
  // Pestaña oculta: nada que dibujar ni calcular; al volver, un cuadro nuevo
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else {
      ultimo = performance.now();
      renderer.setAnimationLoop(bucle);
      invalidar();
    }
  });
  function bucle(): void {
    const ahora = performance.now();
    const dt = Math.min(0.1, (ahora - ultimo) / 1000);
    ultimo = ahora;
    ganchos.forEach((f) => f(dt));
    const v = vistas.get(activa);
    if (!v) return;
    // La inercia de los controles sigue moviendo la cámara después de soltar
    if (v.controles.update()) invalidar();
    const activo = ahora < activoHasta || cuadrosPendientes > 0;
    if (cuadrosPendientes > 0) cuadrosPendientes--;
    if (!activo && ahora - ultimoDibujo < RED_DE_SEGURIDAD_MS) return;
    if (activo && ultimoActivo) {
      fps = fps * 0.95 + (1000 / Math.max(1, ahora - ultimoActivo)) * 0.05;
      medirLentitud(ahora - ultimoActivo);
    }
    ultimoActivo = activo ? ahora : 0;
    ultimoDibujo = ahora;
    dibujados++;
    v.alCuadro?.(v.camara);
    if (economico) renderer.render(v.escena, v.camara);
    else v.composer.render();
    etiquetas.render(v.escena, v.camara);
  }

  // ---------- Modo económico ----------
  const oyentesEconomico = new Set<(si: boolean, automatico: boolean) => void>();
  function fijarEconomico(si: boolean, automatico = false): void {
    if (si === economico) return;
    economico = si;
    renderer.setPixelRatio(si ? 1 : dprNormal);
    // Sin el postprocesado, el mapeo de tonos lo hace el propio renderer
    renderer.toneMapping = si ? ACESFilmicToneMapping : NoToneMapping;
    tamano = '';
    ajustar();
    invalidar();
    oyentesEconomico.forEach((f) => f(si, automatico));
  }
  /**
   * Activación automática con histéresis: si los cuadros a ritmo completo tardan más de 1/24 s
   * de media durante 3 s seguidos, se pasa al modo económico y no se vuelve solo (evita oscilar).
   */
  const LENTO_MS = 1000 / 24;
  let lentoDesde = 0;
  let mediaCuadro = 0;
  let automaticoPermitido = true;
  function medirLentitud(msCuadro: number): void {
    mediaCuadro = mediaCuadro ? mediaCuadro * 0.9 + msCuadro * 0.1 : msCuadro;
    if (economico || !automaticoPermitido) return;
    const ahora = performance.now();
    if (mediaCuadro <= LENTO_MS) lentoDesde = 0;
    else if (!lentoDesde) lentoDesde = ahora;
    else if (ahora - lentoDesde > 3000) fijarEconomico(true, true);
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
    invalidar,
    /** Cuadros dibujados desde el inicio (para medir el trabajo en reposo). */
    dibujados: () => dibujados,
    fijarEconomico,
    economico: () => economico,
    /** El usuario eligió a mano: la activación automática queda desactivada en la sesión. */
    sinAutomatico: () => (automaticoPermitido = false),
    alEconomico: (f: (si: boolean, automatico: boolean) => void) => oyentesEconomico.add(f),
  };
}
