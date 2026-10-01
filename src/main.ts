import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { t } from './i18n';

function aplicarTextos(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Parameters<typeof t>[0]);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as Parameters<typeof t>[0]));
  });
}

function iniciarEscena(canvas: HTMLCanvasElement): void {
  const renderer = new WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 1e-3, 1e9);

  const ajustar = (): void => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', ajustar);
  ajustar();
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

aplicarTextos();
iniciarEscena(document.querySelector<HTMLCanvasElement>('#escena')!);
