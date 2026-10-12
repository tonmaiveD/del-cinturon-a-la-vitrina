# Validación científica: Chelyabinsk (CNEOS → órbita heliocéntrica)

> Generado por `npm run validacion:chelyabinsk` el 2026-10-12. No editar a mano.

## Veredicto

**APROBADA.** Ninguna órbita publicada verificada supera el criterio de parada (D_D > 0.1 o algún elemento a, e, i, q fuera de 3σ de la nube Monte Carlo).

## Entrada

Registro CNEOS (consultado 2026-10-01T13:55:44Z): 2013-02-15 03:20:26 UTC, 54.8°N 61.1°E, 23.3 km, |v| = 18.6 km/s, (vx, vy, vz) = (12.80, -13.30, -2.40) km/s, energía de impacto 441 kt.

Diferencias conocidas entre el registro CNEOS y la literatura:

- Hora del pico: CNEOS da 03:20:26 (consulta actual) y Peña-Asensio et al. 2025 usan 03:20:33 (revisión de 2024); Popova et al. 2013 dan 03:20:32.2 UTC. 7 s mueven la Tierra ~200 km en su órbita: efecto despreciable.
- Altura del pico: CNEOS 23.3 km frente a 29.7 km (Popova et al. 2013).
- Velocidad: CNEOS 18.6 km/s frente a V∞ = 19.16 ± 0.15 km/s (1σ, Popova et al. 2013). Es la diferencia que más pesa en a, e y Vg; el Monte Carlo la cubre (σv del CNEOS).

## Método

1. Posición del pico de brillo con `ObserverState` de astronomy-engine; velocidad rotada de ECEF a EQJ (GAST + precesión/nutación).
2. Marco de la velocidad CNEOS: la documentación oficial solo dice "Earth centered". Hipótesis principal **ECEF-relativa** (se suma ω × r), como en Peña-Asensio et al. 2025; se reporta también la **inercial**.
3. Retropropagación N-cuerpos (Sol, 8 planetas, Luna; DOPRI5, rtol 1e-11) hasta 0.05 AU de la Tierra; después, propagación hacia adelante sin Tierra ni Luna hasta la época del impacto. Elementos osculadores eclípticos J2000 en esa época, comparables con los "pre-atmosféricos" publicados.
4. Comparación: D_D de Drummond (1981), Ec. 2 de Peña-Asensio et al. 2025, y puntuación z de cada órbita publicada frente a la nube Monte Carlo.

### Incertidumbre del CNEOS

Fuente: Peña-Asensio, Socas-Navarro & Seligman 2025, A&A 701, A202 (arXiv:2508.01454v3), Tabla 4. Chelyabinsk pertenece al grupo de "bajo D_D" (energía ≥ 0.45 kt), cuyos errores **medianos** frente a órbitas terrestres son |ΔV| = 0.55 km/s, |Δα_g| = 1.35°, |Δδ_g| = 0.84° (muestra pequeña, distribución asimétrica).

- **Parametrización principal** (decidida antes de ver resultados): normales independientes con σ = mediana / 0.6745 (relación entre la mediana del valor absoluto y σ en una normal).
- **Sensibilidad:** σ = mediana.
- **Dónde se aplican:** sobre el radiante geocéntrico (α_g, δ_g) y la velocidad de entrada, como los mide la Tabla 4; cada clon se reconstruye en el pico de brillo con la inversa de la atracción cenital y se integra igual que la órbita nominal (desde el 2026-10-12; antes se perturbaba el radiante aparente del vector con esos mismos σ).

## Resultados nominales (sin perturbar)

| Cálculo                          | a (AU) | e     | q (AU) | i (°) | ω (°)  | Ω (°)   | Radiante α / δ (°) / Vg (km/s) |
| -------------------------------- | ------ | ----- | ------ | ----- | ------ | ------- | ------------------------------ |
| N-cuerpos, ECEF-relativa         | 1.712  | 0.561 | 0.752  | 4.10  | 109.64 | 326.464 | 334.4 / -0.9 / 14.71           |
| N-cuerpos, inercial              | 1.763  | 0.575 | 0.750  | 4.22  | 109.85 | 326.462 | 334.5 / -0.8 / 15.04           |
| Atracción cenital, ECEF-relativa | 1.712  | 0.560 | 0.752  | 4.10  | 109.69 | 326.413 | 334.6 / -0.7 / 14.57           |
| Atracción cenital, inercial      | 1.762  | 0.574 | 0.750  | 4.22  | 109.89 | 326.413 | 334.6 / -0.5 / 14.89           |

Órbitas publicadas (σ a 1σ; Popova et al. publica a 2σ, aquí convertida):

| Fuente                                                     | a (AU)        | e             | q (AU)        | i (°)       | ω (°)         | Ω (°)             |     |
| ---------------------------------------------------------- | ------------- | ------------- | ------------- | ----------- | ------------- | ----------------- | --- |
| popova-2013-science (verificado)                           | 1.760 ± 0.080 | 0.581 ± 0.009 | 0.739 ± 0.010 | 4.93 ± 0.24 | 108.30 ± 1.90 | 326.4422 ± 0.0014 | —   |
| borovicka-2013-nature (osculadora 60 d antes) (verificado) | 1.720 ± 0.020 | 0.571 ± 0.006 | 0.738 ± 0.002 | 4.98 ± 0.12 | 107.67 ± 0.17 | 326.4590 ± 0.0010 | —   |
| emelyanenko-2014-arxiv (verificado)                        | 1.880 ± 0.068 | 0.609 ± 0.017 | 0.735         | 5.94 ± 0.43 | 108.93 ± 0.54 | 326.4459 ± 0.0020 | —   |
| granvik-brown-2018 (verificado)                            | 1.770 ± 0.022 | 0.579 ± 0.006 | 0.745 ± 0.002 | 4.78 ± 0.13 | 109.22 ± 0.18 | 326.4136 ± 0.0003 | —   |

Radiante geocéntrico de Popova et al. 2013 (1σ): α = 333.2 ± 0.8°, δ = 0.3 ± 0.9°, Vg = 15.3 ± 0.2 km/s.

Retropropagación: 6.2 días hasta 0.05 AU. Tiempo total del Monte Carlo (3 × 1000 clones): 34.3 s.

## Monte Carlo

#### Principal: ECEF-relativa, σ = mediana / 0.6745

σv = 0.82 km/s, σα = 2.00°, σδ = 1.25°, 1000 clones, semilla 20130215.

| Elemento | Media | σ     | Percentil 2.5 % | Percentil 97.5 % |
| -------- | ----- | ----- | --------------- | ---------------- |
| a        | 1.733 | 0.169 | 1.459           | 2.137            |
| e        | 0.563 | 0.042 | 0.474           | 0.645            |
| i        | 4.106 | 0.694 | 2.827           | 5.578            |
| q        | 0.751 | 0.018 | 0.715           | 0.788            |

| Órbita publicada                              | D_D (nominal) | D_D mediana (clones) | z(a)  | z(e) | z(i) | z(q)  |
| --------------------------------------------- | ------------- | -------------------- | ----- | ---- | ---- | ----- |
| popova-2013-science                           | 0.021         | 0.034                | 0.16  | 0.43 | 1.19 | -0.65 |
| borovicka-2013-nature (osculadora 60 d antes) | 0.016         | 0.033                | -0.08 | 0.20 | 1.26 | -0.71 |
| emelyanenko-2014-arxiv                        | 0.045         | 0.047                | 0.87  | 1.09 | 2.64 | -0.86 |
| granvik-brown-2018                            | 0.018         | 0.033                | 0.22  | 0.39 | 0.97 | -0.34 |

#### Sensibilidad: ECEF-relativa, σ = mediana

σv = 0.55 km/s, σα = 1.35°, σδ = 0.84°, 1000 clones, semilla 20130215.

| Elemento | Media | σ     | Percentil 2.5 % | Percentil 97.5 % |
| -------- | ----- | ----- | --------------- | ---------------- |
| a        | 1.722 | 0.110 | 1.531           | 1.974            |
| e        | 0.562 | 0.029 | 0.502           | 0.617            |
| i        | 4.104 | 0.466 | 3.254           | 5.092            |
| q        | 0.751 | 0.012 | 0.727           | 0.777            |

| Órbita publicada                              | D_D (nominal) | D_D mediana (clones) | z(a)  | z(e) | z(i) | z(q)  |
| --------------------------------------------- | ------------- | -------------------- | ----- | ---- | ---- | ----- |
| popova-2013-science                           | 0.021         | 0.027                | 0.34  | 0.67 | 1.77 | -1.01 |
| borovicka-2013-nature (osculadora 60 d antes) | 0.016         | 0.025                | -0.02 | 0.32 | 1.88 | -1.09 |
| emelyanenko-2014-arxiv                        | 0.045         | 0.045                | 1.44  | 1.65 | 3.93 | -1.31 |
| granvik-brown-2018                            | 0.018         | 0.024                | 0.43  | 0.60 | 1.45 | -0.55 |

#### Hipótesis inercial, σ = mediana / 0.6745

σv = 0.82 km/s, σα = 2.00°, σδ = 1.25°, 1000 clones, semilla 20130215.

| Elemento | Media | σ     | Percentil 2.5 % | Percentil 97.5 % |
| -------- | ----- | ----- | --------------- | ---------------- |
| a        | 1.786 | 0.182 | 1.492           | 2.225            |
| e        | 0.577 | 0.042 | 0.488           | 0.660            |
| i        | 4.230 | 0.706 | 2.927           | 5.723            |
| q        | 0.748 | 0.018 | 0.712           | 0.785            |

| Órbita publicada                              | D_D (nominal) | D_D mediana (clones) | z(a)  | z(e)  | z(i) | z(q)  |
| --------------------------------------------- | ------------- | -------------------- | ----- | ----- | ---- | ----- |
| popova-2013-science                           | 0.011         | 0.032                | -0.14 | 0.10  | 0.99 | -0.52 |
| borovicka-2013-nature (osculadora 60 d antes) | 0.012         | 0.032                | -0.36 | -0.13 | 1.06 | -0.57 |
| emelyanenko-2014-arxiv                        | 0.033         | 0.039                | 0.52  | 0.76  | 2.42 | -0.72 |
| granvik-brown-2018                            | 0.007         | 0.031                | -0.09 | 0.06  | 0.78 | -0.21 |

## ¿Qué marco usa CNEOS? Prueba con los 18 eventos calibrados

Datos y órbitas de referencia: Peña-Asensio et al. 2025, Tablas 2 y 3 (`data/calibracion/pena-asensio-2025.json`). D_D de nuestra órbita frente a la órbita terrestre de referencia y frente a la órbita que esos autores calculan desde CNEOS.

| Evento         | Bajo D_D | D_D publicado (Peña–ref.) | ECEF-rel. vs ref. | Inercial vs ref. | ECEF-rel. vs Peña-CNEOS | Inercial vs Peña-CNEOS |
| -------------- | -------- | ------------------------- | ----------------- | ---------------- | ----------------------- | ---------------------- |
| 2008 TC3       | sí       | 0.035                     | 0.048             | 0.009            | 0.015                   | 0.026                  |
| Buzzard Coulee | no       | 0.330                     | 0.336             | 0.329            | 0.018                   | 0.007                  |
| Košice         | no       | 0.007                     | 0.009             | 0.023            | 0.006                   | 0.022                  |
| Chelyabinsk    | sí       | 0.016                     | 0.015             | 0.012            | 0.006                   | 0.015                  |
| Kalabity       | no       | 0.290                     | 0.290             | 0.274            | 0.015                   | 0.022                  |
| Romania        | no       | 0.232                     | 0.216             | 0.222            | 0.021                   | 0.014                  |
| Sariçiçek      | no       | 1.045                     | 1.044             | 1.055            | 0.006                   | 0.022                  |
| Baird Bay      | no       | 0.007                     | 0.007             | 0.012            | 0.007                   | 0.011                  |
| 2018 LA        | sí       | 0.030                     | 0.019             | 0.014            | 0.011                   | 0.031                  |
| Ozerki         | sí       | 0.032                     | 0.031             | 0.047            | 0.005                   | 0.022                  |
| Viñales        | sí       | 0.019                     | 0.021             | 0.020            | 0.005                   | 0.011                  |
| 2019 MO        | sí       | 0.060                     | 0.060             | 0.051            | 0.006                   | 0.028                  |
| Flensburg      | sí       | 0.045                     | 0.045             | 0.040            | 0.005                   | 0.007                  |
| Novo Mesto     | sí       | 0.024                     | 0.024             | 0.028            | 0.008                   | 0.011                  |
| Ådalen         | sí       | 0.047                     | 0.041             | 0.053            | 0.009                   | 0.005                  |
| 2022 EB5       | sí       | 0.072                     | 0.073             | 0.074            | 0.007                   | 0.006                  |
| Iberian        | sí       | 0.019                     | 0.020             | 0.043            | 0.014                   | 0.016                  |
| 2024 RW1       | sí       | 0.040                     | 0.040             | 0.053            | 0.008                   | 0.011                  |

Grupo de bajo D_D (n = 12), medianas: frente a la referencia terrestre, ECEF-relativa 0.0355 e inercial 0.0417; frente al cálculo de Peña-Asensio, ECEF-relativa 0.0075 e inercial 0.0133.

**Conclusiones:**

1. Con la hipótesis ECEF-relativa reproducimos las órbitas que Peña-Asensio et al. calculan desde CNEOS con un método independiente (atracción cenital). Esto valida la implementación.
2. Frente a las órbitas terrestres, las dos hipótesis no se distinguen: la velocidad de rotación (≤ 0.46 km/s) es menor que el error típico del CNEOS (~0.55 km/s mediano). **El marco no se puede resolver empíricamente con estos datos.** Se adopta ECEF-relativa por el nombre del marco y el uso en la literatura; la diferencia queda documentada como incertidumbre sistemática.

## Limitaciones

- La Tabla 2 de Borovička et al. 2013 (Nature) se leyó en el original (2026-10-07). Su órbita es osculadora 60 días antes del impacto, no pre-atmosférica en el instante del impacto, y sus incertidumbres no declaran nivel (se asumen 1σ): la comparación con la órbita calculada desde el CNEOS es orientativa, aunque entra en el criterio de parada como las demás.
- σ independientes y gaussianas: la Tabla 4 da medianas y percentiles asimétricos de una muestra de 18 eventos.
- No se modela la desaceleración atmosférica antes del pico de brillo.
- Las incertidumbres de Emel'yanenko et al. son formales, sin nivel declarado; se asumen 1σ.
