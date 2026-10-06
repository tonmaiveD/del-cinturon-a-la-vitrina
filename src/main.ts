/**
 * Arranque ligero: textos, panel, ficha y fuentes se muestran de inmediato; la escena 3D
 * (Three.js, astronomy-engine) se descarga después con import() dinámico.
 */
import { t } from './i18n';
import { montarDialogos } from './ui/dialogos';
import type { Catalogo } from './ui/catalogo';
import { leerEstadoUrl } from './ui/estado-url';
import { montarPanelPieza } from './ui/panel-pieza';
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
// En pantallas pequeñas los bloques de texto empiezan plegados para no tapar la escena
if (window.matchMedia('(max-width: 640px)').matches)
  document.querySelectorAll('.plegable').forEach((d) => d.removeAttribute('open'));

const { pieza } = leerEstadoUrl(location.search, {
  pieza: 'chelyabinsk',
  vista: 'tierra',
  escalaVisual: true,
});
const panel = catalogo.then((c) => montarPanelPieza(c, pieza));

import('./app3d')
  .then(({ iniciar3D }) => iniciar3D(datos, panel))
  .catch(() => {
    document.querySelector('#descripcion')!.textContent = t('error.datos');
  });
