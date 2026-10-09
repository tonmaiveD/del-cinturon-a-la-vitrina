/**
 * Arranque ligero: textos, panel, ficha y fuentes se muestran de inmediato; la escena 3D
 * (Three.js, astronomy-engine) se descarga después con import() dinámico.
 */
import { t } from './i18n';
import { montarDialogos } from './ui/dialogos';
import { avisarError, hayWebgl } from './ui/avisos';
import { montarHoja } from './ui/hoja';
import type { Catalogo } from './ui/catalogo';
import { leerEstadoUrl } from './ui/estado-url';
import { montarModo } from './ui/modo';
import { montarPanelPieza } from './ui/panel-pieza';
import type { ResumenCneos } from './cneos/resumen';
import type { PanelCneos } from './cneos/panel';
import { cargarJson, precargar } from './ui/recursos';
import { aplicarTextos } from './ui/textos';
import type { DatosEscena } from './app3d';

const datos = precargar<DatosEscena>({
  orbitas: 'data/chelyabinsk-orbitas.json',
  trayectoria: 'data/chelyabinsk-trayectoria.json',
});

const catalogo = cargarJson<Catalogo>('data/catalogo.json');

aplicarTextos();
montarDialogos();
montarHoja();
// En pantallas pequeñas los bloques de texto empiezan plegados para no tapar la escena
if (window.matchMedia('(max-width: 640px)').matches)
  document.querySelectorAll('.plegable').forEach((d) => d.removeAttribute('open'));

const estado = leerEstadoUrl(location.search, {
  pieza: 'chelyabinsk',
  vista: 'tierra',
  escalaVisual: true,
});
const panel = catalogo.then((c) => montarPanelPieza(c, estado.pieza));
const modo = montarModo(estado.modo ?? 'pedigri');

// Datos del CNEOS: solo se descargan al entrar en ese modo (la carga inicial no los necesita)
let panelCneos: Promise<PanelCneos> | undefined;
function asegurarCneos(): Promise<PanelCneos> {
  panelCneos ??= Promise.all([
    cargarJson<ResumenCneos>('data/cneos/eventos.json'),
    import('./cneos/panel'),
  ])
    .then(([r, { montarPanelCneos }]) => montarPanelCneos(r, estado.evento))
    .catch((e: unknown) => {
      panelCneos = undefined; // un fallo no queda guardado: el reintento vuelve a pedirlo
      throw e;
    });
  return panelCneos;
}
if (modo.actual() === 'cneos') void asegurarCneos();
modo.alCambiar((m) => m === 'cneos' && void asegurarCneos());

// Sin WebGL no se intenta la escena: los paneles (selección, procedencia, fuentes) siguen
if (!hayWebgl()) {
  document.querySelector('#descripcion')!.textContent = t('error.webgl');
  avisarError('webgl', t('error.webgl'));
} else
  import('./app3d')
    .then(({ iniciar3D }) => iniciar3D(datos, panel, { modo, asegurarCneos }))
    .catch(() => {
      document.querySelector('#descripcion')!.textContent = t('error.datos');
      avisarError('inicio', t('error.inicio'), () => location.reload());
    });
