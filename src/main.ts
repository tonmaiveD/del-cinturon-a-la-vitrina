/**
 * Arranque ligero: textos, panel, ficha y fuentes se muestran de inmediato; la escena 3D
 * (Three.js, astronomy-engine) se descarga después con import() dinámico.
 */
import { t } from './i18n';
import { montarDialogos } from './ui/dialogos';
import { precargar } from './ui/recursos';
import { aplicarTextos } from './ui/textos';
import type { DatosEscena } from './app3d';

const datos = precargar<DatosEscena>({
  orbitas: 'data/chelyabinsk-orbitas.json',
  trayectoria: 'data/chelyabinsk-trayectoria.json',
});

aplicarTextos();
montarDialogos();
// En pantallas pequeñas la descripción empieza plegada para no tapar la escena
if (window.matchMedia('(max-width: 640px)').matches)
  document.querySelector('.descripcion-plegable')?.removeAttribute('open');

import('./app3d')
  .then(({ iniciar3D }) => iniciar3D(datos))
  .catch(() => {
    document.querySelector('#descripcion')!.textContent = t('error.datos');
  });
