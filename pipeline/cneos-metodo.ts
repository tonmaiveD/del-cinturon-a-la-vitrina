/**
 * Parámetros y huella del método de las órbitas del CNEOS (M18). Separado del cálculo para que
 * la huella cubra solo el código que produce el resultado (`ARCHIVO_CALCULO` y sus imports).
 */
import type { CalidadCneos } from '../src/schema';
import { ARCHIVO_CALCULO, N_CLONES, type MetodoCneos } from './cneos-calculo';
import { huellaMetodo } from './huella-metodo';

const MAD_A_SIGMA = 1 / 0.6744897501960817;

/**
 * σ = mediana / 0,6745 de la Tabla 4 de Peña-Asensio et al. 2025 (grupo de bajo D_D), aplicada
 * al radiante geocéntrico y a la velocidad (M09), y la huella del método.
 */
export function metodoCneos(tabla4: CalidadCneos): MetodoCneos {
  const bajo = tabla4.grupos.find((g) => g.id === 'bajo-dd')!;
  const inc = {
    sigmaV: bajo.v_kms.mediana * MAD_A_SIGMA,
    sigmaRaGrados: bajo.alfa_g_grados.mediana * MAD_A_SIGMA,
    sigmaDecGrados: bajo.delta_g_grados.mediana * MAD_A_SIGMA,
  };
  const parametros = { INC: inc, N_CLONES, tabla4: bajo, perturbacion: 'radiante-geocentrico' };
  return { huella: huellaMetodo(parametros, ARCHIVO_CALCULO), inc, fuenteSigma: tabla4.fuente };
}
