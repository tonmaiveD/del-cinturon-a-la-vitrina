# Bólidos del CNEOS: datos y órbitas (Fase 3, etapa 1)

Generado por `npm run reporte:cneos`. Consulta de la API: 2026-10-07T15:56:11Z (versión 1.2); evento más reciente: 2026-10-04T03:14:45Z.

## Eventos por calidad

| Clase | Eventos | % | Qué se muestra |
| --- | --- | --- | --- |
| Con órbita (grupo de bajo D_D) | 260 | 24,2 % | posición, energía, trayectoria y nube de órbitas |
| Vector, grupo de alto D_D | 100 | 9,3 % | posición, energía y trayectoria; sin órbita (decisión del 2026-10-06) |
| Vector sin altura | 3 | 0,3 % | posición y energía; sin trayectoria ni órbita |
| Ubicación sin vector | 525 | 48,9 % | posición y energía |
| Sin ubicación | 186 | 17,3 % | solo en listas (fecha y energía) |
| **Total** | 1074 | | |

## Criterio de fiabilidad

Peña-Asensio et al. 2025, Tabla 4: grupo de bajo D_D si el año es ≥ 2018 o la energía de impacto es ≥ 0,45 kt. Con los 18 eventos calibrados la regla es **conservadora**:

| Evento | Fecha | E_i (kt) | D_D publicado | Grupo por la regla |
| --- | --- | --- | --- | --- |
| 2008 TC3 | 2008-10-07 | 1,00 | 0,035 | bajo D_D (órbita) |
| Buzzard Coulee | 2008-11-21 | 0,41 | 0,330 | alto D_D (sin órbita) |
| Košice | 2010-02-28 | 0,44 | 0,007 | alto D_D (sin órbita) ⚠ |
| Chelyabinsk | 2013-02-15 | 440,00 | 0,016 | bajo D_D (órbita) |
| Kalabity | 2015-01-02 | 0,07 | 0,290 | alto D_D (sin órbita) |
| Romania | 2015-01-07 | 0,40 | 0,232 | alto D_D (sin órbita) |
| Sariçiçek | 2015-09-02 | 0,13 | 1,045 | alto D_D (sin órbita) |
| Baird Bay | 2017-06-30 | 0,29 | 0,007 | alto D_D (sin órbita) ⚠ |
| 2018 LA | 2018-06-02 | 0,98 | 0,030 | bajo D_D (órbita) |
| Ozerki | 2018-06-21 | 2,80 | 0,032 | bajo D_D (órbita) |
| Viñales | 2019-02-01 | 1,40 | 0,019 | bajo D_D (órbita) |
| 2019 MO | 2019-06-22 | 6,00 | 0,060 | bajo D_D (órbita) |
| Flensburg | 2019-09-12 | 0,48 | 0,045 | bajo D_D (órbita) |
| Novo Mesto | 2020-02-28 | 0,34 | 0,024 | bajo D_D (órbita) |
| Ådalen | 2020-11-07 | 0,33 | 0,047 | bajo D_D (órbita) |
| 2022 EB5 | 2022-03-11 | 4,00 | 0,072 | bajo D_D (órbita) |
| Iberian | 2024-05-18 | 0,13 | 0,019 | bajo D_D (órbita) |
| 2024 RW1 | 2024-09-04 | 0,20 | 0,040 | bajo D_D (órbita) |

Ningún evento clasificado como fiable tiene D_D ≥ 0,1. Dos eventos del grupo «sin órbita» (⚠) tienen en realidad buena órbita: el grupo significa «no verificable de antemano», no «erróneo».

Errores medianos del grupo de alto D_D (Tabla 4): velocidad 6,05 km/s, α_g 67,24°, δ_g 11,71°, a 1,58 AU, ω 83,07°.

## Monte Carlo

200 clones por evento, σ_v = 0,815 km/s, σ_α = 2,002°, σ_δ = 1,245° (medianas de la Tabla 4 / 0,6745, igual que en la validación de Chelyabinsk), semilla derivada del id del evento. Retropropagación N cuerpos hasta 0,05 AU (método validado en la Fase 1).

- Eventos sin órbita calculable: 2 (cneos-20180419-133939: el objeto no salió de la influencia terrestre en 60 días; cneos-20110525-054002: el objeto no salió de la influencia terrestre en 60 días). La retropropagación no sale de la influencia terrestre en 60 días: velocidad geocéntrica muy baja, sin solución heliocéntrica con este método. Se muestran sin órbita, con el motivo.
- Clones descartados porque su integración falló: 709 de 51600. Eventos con más del 10 % de clones descartados: 10 (cneos-20260323-192343: 47; cneos-20250329-081243: 21; cneos-20200918-080526: 57; cneos-20200802-163624: 99; cneos-20190521-131233: 61; cneos-20190422-214210: 107; cneos-20190122-091800: 82; cneos-20180503-072359: 80; cneos-20160516-100941: 26; cneos-20090823-211719: 24). En ellos la nube puede estar sesgada hacia las soluciones que sí convergen.
- Eventos cuya órbita nominal es hiperbólica (e ≥ 1): 5 de 258.
- Eventos con más de la mitad de los clones hiperbólicos: 5 (2026-04-01, 69,2 km/s; 2022-07-28, 29,9 km/s; 2021-05-06, 26,6 km/s; 2017-03-09, 36,5 km/s; 2009-04-10, 19,1 km/s).

Una órbita hiperbólica calculada a partir del CNEOS no se interpreta aquí: puede ser consecuencia del error de la velocidad publicada. La escena la mostrará como hiperbólica, sin más lectura.

## Eventos con órbita por año

| Año | Eventos |
| --- | --- |
| 2003 | 2 |
| 2004 | 4 |
| 2005 | 2 |
| 2006 | 5 |
| 2007 | 1 |
| 2008 | 2 |
| 2009 | 6 |
| 2010 | 6 |
| 2011 | 2 |
| 2012 | 4 |
| 2013 | 6 |
| 2014 | 5 |
| 2015 | 3 |
| 2016 | 9 |
| 2017 | 4 |
| 2018 | 21 |
| 2019 | 28 |
| 2020 | 24 |
| 2021 | 20 |
| 2022 | 24 |
| 2023 | 24 |
| 2024 | 22 |
| 2025 | 22 |
| 2026 | 14 |
