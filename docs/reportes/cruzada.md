# Verificación cruzada de órbitas con pedigrí

> Generado por `npm run verificacion:cruzada` el 2026-10-05. No editar a mano.

## Veredicto

**CRITERIO DE PARADA ACTIVADO** en 1 par(es):

- Almahata Sitta (JPL Horizons, 2008 TC3 (órbita telescópica, 2008-09-07)): D_D = 0.042; z(a, e, i, q) = -143.9 | -245.9 | -61.1 | 128.2

z = (fuente − Granvik & Brown) / √(σ₁² + σ₂²). D_D: Drummond (1981).

## A. Fuentes independientes frente a Granvik & Brown 2018

| Meteorito        | Fuente                                                  | Definición de la órbita                               | D_D   | z(a)   | z(e)   | z(i)  | z(q)  |
| ---------------- | ------------------------------------------------------- | ----------------------------------------------------- | ----- | ------ | ------ | ----- | ----- |
| Žďár nad Sázavou | Spurný et al. 2020, Tabla 2                             | pre-atmosférica (método analítico de Ceplecha)        | 0.001 | -0.8   | -0.9   | -0.6  | 1.7   |
| Annama           | Trigo-Rodríguez et al. 2015, Tabla 4                    | pre-atmosférica                                       | 0.010 | -0.5   | 0.0    | 0.6   | -1.2  |
| Almahata Sitta   | JPL Horizons, 2008 TC3 (órbita telescópica, 2008-09-07) | osculadora antes del encuentro (sin efecto terrestre) | 0.042 | -143.9 | -245.9 | -61.1 | 128.2 |
| Chelyabinsk      | popova-2013-science                                     | pre-atmosférica                                       | 0.005 | -0.1   | 0.2    | 0.5   | -0.6  |
| Chelyabinsk      | emelyanenko-2014-arxiv                                  | pre-atmosférica                                       | 0.027 | 1.5    | 1.6    | 2.6   | -0.2  |

Valores: Granvik & Brown → Žďár nad Sázavou (Spurný et al. 2020): a 2.093 vs 2.102, e 0.6792 vs 0.6808, i 2.80° vs 2.81°; Annama (Trigo-Rodríguez et al. 2015): a 1.990 vs 2.080, e 0.6900 vs 0.6900, i 14.65° vs 14.23°; Almahata Sitta (JPL Horizons): a 1.265 vs 1.308, e 0.2813 vs 0.3060, i 2.30° vs 2.44°; Chelyabinsk (popova-2013-science): a 1.760 vs 1.770, e 0.5810 vs 0.5792, i 4.93° vs 4.78°; Chelyabinsk (emelyanenko-2014-arxiv): a 1.880 vs 1.770, e 0.6090 vs 0.5792, i 5.94° vs 4.78°.

## B. Validación del método propio con JPL Horizons (2008 TC3)

Estado geocéntrico de Horizons a 2454745.5 TDB (~27 h antes del impacto) → retropropagación N cuerpos hasta 0,05 AU → propagación sin Tierra ni Luna hasta el impacto. Comparado con los elementos osculadores de JPL del 2008-09-07, cuando la Tierra aún no perturbaba la órbita:

|                           | a (AU)  | e       | i (°)  | ω (°)   | Ω (°)   |
| ------------------------- | ------- | ------- | ------ | ------- | ------- |
| Método propio             | 1.26543 | 0.28145 | 2.2969 | 233.897 | 194.173 |
| JPL Horizons (2008-09-07) | 1.26530 | 0.28129 | 2.2967 | 233.876 | 194.188 |

D_D = 0.0003. El método propio reproduce la órbita telescópica previa al encuentro.

## C. Granvik & Brown 2018 frente a Borovička et al. 2015 (misma base de datos)

No son independientes (mismas observaciones, autores en común); detecta errores de transcripción o de cálculo. σ de Borovička et al. = una unidad en la última cifra publicada.

| Meteorito             | D_D   | z(a) | z(e) | z(i) | z(q)   |
| --------------------- | ----- | ---- | ---- | ---- | ------ |
| Příbram               | 0.000 | -0.9 | -1.0 | -0.2 | -0.9   |
| Lost City             | 0.005 | 1.1  | 2.3  | 0.6  | -0.2   |
| Innisfree             | 0.001 | 0.1  | 0.1  | 0.1  | 0.0    |
| Benešov               | 0.000 | 0.2  | 0.2  | 0.0  | -0.5   |
| Peekskill             | 0.006 | 0.1  | 0.4  | 0.1  | 0.2    |
| Tagish Lake           | 0.004 | 0.0  | -0.1 | -0.1 | 0.0    |
| Morávka               | 0.001 | -0.0 | 0.0  | -0.2 | 0.0    |
| Neuschwanstein        | 0.001 | 0.1  | 0.3  | -0.2 | -0.2   |
| Park Forest           | 0.000 | 0.0  | 0.0  | -0.1 | 0.0    |
| Villalbeto de la Peña | 0.002 | 0.0  | 0.1  | -0.0 | 0.1    |
| Bunburra Rockhole     | 0.000 | -0.1 | 0.1  | 0.2  | -0.1   |
| Almahata Sitta        | 0.011 | -0.9 | 60.3 | 41.7 | -814.0 |
| Buzzard Coulee        | 0.000 | 0.1  | 0.0  | -0.1 | 0.0    |
| Maribo                | 0.002 | 0.0  | 0.0  | 0.0  | 0.1    |
| Jesenice              | 0.002 | 0.1  | 0.1  | 0.0  | 0.0    |
| Grimsby               | 0.000 | 0.1  | 0.0  | 0.1  | 0.0    |
| Košice                | 0.002 | -0.1 | -0.1 | 0.0  | 0.2    |
| Mason Gully           | 0.000 | -0.1 | -0.1 | 0.0  | -0.0   |
| Križevci              | 0.000 | 0.1  | 0.1  | 0.1  | 0.0    |
| Sutter's Mill         | 0.001 | 0.1  | 0.0  | 0.0  | 0.0    |
| Novato                | 0.002 | -0.0 | -0.1 | -0.1 | 0.2    |
| Chelyabinsk           | 0.010 | -2.1 | -1.3 | 1.5  | -2.9   |

## D. Error del método analítico: N cuerpos desde el radiante de Granvik & Brown

Con el radiante geocéntrico, v_g, instante y posición de referencia que publican Granvik & Brown (altura supuesta: 50 km), se integra la órbita con N cuerpos y se compara con sus elementos (calculados con el método analítico de Ceplecha 1987). Ordenado por v_g.

| Meteorito             | v_g (km/s) | Δa (AU) | D_D   | z(a)  | z(e)  | z(i) | z(q) |
| --------------------- | ---------- | ------- | ----- | ----- | ----- | ---- | ---- |
| Bunburra Rockhole     | 6.74       | -0.0003 | 0.001 | -0.3  | 0.2   | 0.2  | -0.3 |
| Almahata Sitta        | 6.80       | -0.0132 | 0.008 | -44.0 | -43.2 | 3.9  | —    |
| Novato                | 8.22       | 0.0002  | 0.000 | 0.0   | -0.0  | 0.0  | -0.0 |
| Jesenice              | 8.28       | 0.0013  | 0.000 | 0.0   | 0.0   | -0.0 | 0.0  |
| Lost City             | 9.20       | 0.0010  | 0.000 | 0.3   | 0.3   | -0.1 | -0.3 |
| Mason Gully           | 9.32       | 0.0044  | 0.001 | 0.5   | 0.5   | -0.0 | 0.2  |
| Innisfree             | 9.40       | 0.0006  | 0.000 | 0.0   | -0.0  | 0.0  | —    |
| Ejby                  | 9.44       | 0.0047  | 0.000 | 0.0   | 0.0   | 0.1  | 0.2  |
| Peekskill             | 10.09      | 0.0004  | 0.000 | 0.0   | 0.0   | -0.1 | -0.0 |
| Košice                | 10.31      | 0.0037  | 0.000 | 0.0   | 0.0   | 0.0  | 0.0  |
| Tagish Lake           | 11.31      | 0.0046  | 0.001 | 0.0   | 0.0   | -0.0 | 0.0  |
| Villalbeto de la Peña | 12.92      | -0.0005 | 0.001 | -0.0  | -0.0  | -0.0 | -0.0 |
| Buzzard Coulee        | 14.19      | -0.0014 | 0.000 | -0.0  | -0.0  | 0.0  | -0.1 |
| Križevci              | 14.46      | 0.0009  | 0.000 | 0.1   | 0.1   | 0.0  | 0.1  |
| Chelyabinsk           | 15.30      | -0.0083 | 0.005 | -0.4  | 0.2   | 1.4  | -2.8 |
| Park Forest           | 16.05      | 0.0104  | 0.001 | 0.0   | 0.0   | -0.0 | 0.0  |
| Příbram               | 17.44      | 0.0002  | 0.000 | 0.1   | 0.1   | 0.3  | -0.9 |
| Neuschwanstein        | 17.51      | 0.0010  | 0.000 | 0.1   | 0.1   | -0.0 | -0.1 |
| Grimsby               | 17.89      | 0.0009  | 0.000 | 0.0   | -0.0  | 0.0  | 0.2  |
| Benešov               | 18.08      | 0.0011  | 0.000 | 0.5   | 0.5   | 0.3  | -0.3 |
| Žďár nad Sázavou      | 18.61      | 0.0002  | 0.000 | 0.0   | 0.1   | 0.1  | -0.2 |
| Morávka               | 19.60      | 0.0017  | 0.001 | 0.0   | 0.0   | -0.0 | 0.0  |
| Annama                | 21.45      | 0.0026  | 0.001 | 0.0   | 0.0   | -0.0 | 0.1  |
| Maribo                | 25.80      | 0.0044  | 0.002 | 0.0   | 0.0   | -0.0 | 0.0  |
| Sutter's Mill         | 25.96      | 0.0069  | 0.001 | 0.0   | -0.0  | 0.0  | 0.0  |

## E. Órbitas calculadas desde el CNEOS frente a Granvik & Brown

| Evento         | Grupo CNEOS (Peña-Asensio 2025) | D_D   |
| -------------- | ------------------------------- | ----- |
| 2008 TC3       | bajo D_D                        | 0.056 |
| Buzzard Coulee | alto D_D (pre-2018, < 0,45 kt)  | 0.336 |
| Košice         | alto D_D (pre-2018, < 0,45 kt)  | 0.008 |
| Chelyabinsk    | bajo D_D                        | 0.018 |
