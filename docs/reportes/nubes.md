# Nubes de órbitas de las piezas con pedigrí

Generado por `npm run datos:nubes` (`pipeline/nubes-pedigri.ts`) el 2026-10-13. No editar a mano.

Código: commit dcc8ea2 con cambios sin confirmar · astronomy-engine 2.1.19 · Node v22.22.0 · huella del código y los datos de entrada c24bc87ddfb7596d

## Método

Para cada pieza se sortean el radiante geocéntrico (α_g, δ_g) y la velocidad geocéntrica v_g publicados, con distribuciones normales independientes de desviación típica igual a su incertidumbre a 1σ, y cada clon se integra con N cuerpos desde la posición e instante de referencia (altura convencional de 100 km), igual que la estela del año previo; los elementos son los pre-atmosféricos en ese instante. Almahata Sitta: sorteo de los elementos de su órbita telescópica de JPL (σ formal). Chelyabinsk (decisión del 2026-10-12, método C): se sortean q, e, i, ω y Ω de la órbita de Popova et al. (Tabla S5B, 1σ; a = q/(1 − e)); cada órbita se coloca en su punto más cercano a la Tierra en el instante de entrada y solo se conserva si su parámetro de impacto no supera el radio de captura, es decir, si choca con la Tierra en la aproximación de dos cuerpos (desde el 2026-10-12, auditoría V5; antes, distancia geométrica < 15 000 km).

Criterio de parada por pieza: el radiante central reproduce la órbita principal (D_D ≤ 0.1), todas las órbitas pasan a menos de 0.002 au (299.196 km) de la Tierra en el instante de referencia y se descarta como mucho el 10 % de los sorteos (órbitas no elípticas). En Chelyabinsk (método C): todas las órbitas chocan con la Tierra en la aproximación de dos cuerpos (parámetro de impacto menor o igual que el radio de captura, con 100 km de atmósfera sobre 6371 km de radio terrestre), la órbita central publicada también, y la mediana de la nube a D_D ≤ 0.1 de la órbita publicada.

Hasta el 2026-10-12 cada nube sorteaba los elementos orbitales por separado. Con ese método, en 21 de las 25 piezas menos de la mitad de las órbitas pasaba a menos de 0,002 au de la Tierra (en Chelyabinsk, el 6 %; en Maribo y Villalbeto de la Peña, ninguna).

## Resultado

| Pieza                 | Método                  | Fuente              | Órbitas | Descartadas | D_D centro | Distancia mediana | Distancia máxima | σa nube / publicada (au) | σe nube / publicada | σi nube / publicada (°) | σq nube / publicada (au) | Aprobada |
| --------------------- | ----------------------- | ------------------- | ------- | ----------- | ---------- | ----------------- | ---------------- | ------------------------ | ------------------- | ----------------------- | ------------------------ | -------- |
| almahata-sitta        | elementos               | jpl-horizons        | 160     | 0           | —          | 60.138 km         | 63.280 km        | 0 / 0                    | 0 / 0               | 0 / 0                   | 0 / 0                    | sí       |
| annama                | radiante                | granvik-brown-2018  | 160     | 0           | 0,00091    | 10.621 km         | 11.070 km        | 0,101 / 0,13             | 0,0168 / 0,021      | 0,36 / 0,49             | 0,0056 / 0,0054          | sí       |
| benesov               | radiante                | granvik-brown-2018  | 160     | 0           | 0,00017    | 13.613 km         | 13.763 km        | 0,002 / 0,002            | 0,0003 / 0,0004     | 0,01 / 0,01             | 0 / 0,0001               | sí       |
| bunburra-rockhole     | radiante                | granvik-brown-2018  | 160     | 0           | 0,00082    | 48.171 km         | 49.367 km        | 0,001 / 0,001            | 0,0012 / 0,0014     | 0,06 / 0,07             | 0,0014 / 0,0019          | sí       |
| buzzard-coulee        | radiante                | granvik-brown-2018  | 160     | 0           | 0,00057    | 17.653 km         | 19.897 km        | 0,024 / 0,029            | 0,0146 / 0,018      | 0,8 / 0,78              | 0,0011 / 0,0015          | sí       |
| chelyabinsk           | elementos-condicionados | popova-2013-science | 300     | 0           | 0,00162    | 7929 km           | 13.314 km        | 0,039 / 0,08             | 0,0088 / 0,009      | 0,24 / 0,24             | 0,0072 / 0,01            | sí       |
| ejby                  | radiante                | granvik-brown-2018  | 160     | 0           | 0,00041    | 30.368 km         | 32.014 km        | 0,094 / 0,094            | 0,0117 / 0,012      | 0,11 / 0,1              | 0,0003 / 0,0006          | sí       |
| grimsby               | radiante                | granvik-brown-2018  | 160     | 0           | 0,0005     | 13.314 km         | 13.763 km        | 0,043 / 0,048            | 0,0103 / 0,011      | 0,25 / 0,28             | 0,0005 / 0,0003          | sí       |
| innisfree             | radiante                | granvik-brown-2018  | 160     | 0           | 0,00043    | 30.967 km         | 33.211 km        | 0,047 / 0,051            | 0,0133 / 0,014      | 0,24 / 0,22             | 0 / 0                    | sí       |
| jesenice              | radiante                | granvik-brown-2018  | 160     | 0           | 0,00037    | 36.951 km         | 45.328 km        | 0,083 / 0,068            | 0,0269 / 0,023      | 0,42 / 0,48             | 0,0006 / 0,0007          | sí       |
| kosice                | radiante                | granvik-brown-2018  | 160     | 0           | 0,00052    | 25.432 km         | 29.172 km        | 0,241 / 0,23             | 0,0301 / 0,03       | 0,7 / 0,47              | 0,0031 / 0,0042          | sí       |
| krizevci              | radiante                | granvik-brown-2018  | 160     | 0           | 0,00025    | 17.204 km         | 17.503 km        | 0,008 / 0,009            | 0,0033 / 0,0034     | 0,02 / 0,03             | 0,0011 / 0,0012          | sí       |
| lost-city             | radiante                | granvik-brown-2018  | 160     | 0           | 0,00049    | 29.920 km         | 30.069 km        | 0,002 / 0,004            | 0,0007 / 0,0013     | 0,02 / 0,03             | 0,0001 / 0,0002          | sí       |
| maribo                | radiante                | granvik-brown-2018  | 160     | 0           | 0,00166    | 9125 km           | 9275 km          | 0,194 / 0,27             | 0,0113 / 0,015      | 0,31 / 1,3              | 0,0117 / 0,018           | sí       |
| mason-gully           | radiante                | granvik-brown-2018  | 160     | 0           | 0,00051    | 30.518 km         | 30.817 km        | 0,009 / 0,009            | 0,0013 / 0,0014     | 0,01 / 0,03             | 0,0001 / 0,0002          | sí       |
| moravka               | radiante                | granvik-brown-2018  | 160     | 0           | 0,00099    | 10.771 km         | 11.070 km        | 0,044 / 0,079            | 0,0127 / 0,022      | 0,31 / 0,42             | 0,001 / 0,0038           | sí       |
| neuschwanstein        | radiante                | granvik-brown-2018  | 160     | 0           | 0,00013    | 13.314 km         | 13.613 km        | 0,014 / 0,017            | 0,0021 / 0,0024     | 0,03 / 0,03             | 0,0004 / 0,0004          | sí       |
| novato                | radiante                | granvik-brown-2018  | 160     | 0           | 0,00061    | 34.258 km         | 37.848 km        | 0,06 / 0,079             | 0,0135 / 0,018      | 0,16 / 0,11             | 0,0004 / 0,0004          | sí       |
| park-forest           | radiante                | granvik-brown-2018  | 160     | 0           | 0,00105    | 15.109 km         | 16.157 km        | 0,208 / 0,21             | 0,0243 / 0,025      | 0,36 / 0,66             | 0,009 / 0,0098           | sí       |
| peekskill             | radiante                | granvik-brown-2018  | 160     | 0           | 0,00033    | 23.337 km         | 24.085 km        | 0,009 / 0,015            | 0,0037 / 0,0055     | 0,09 / 0,15             | 0,0013 / 0,0018          | sí       |
| pribram               | radiante                | granvik-brown-2018  | 160     | 0           | 0,00005    | 13.165 km         | 13.314 km        | 0,004 / 0,004            | 0,0005 / 0,0006     | 0,01 / 0,01             | 0,0001 / 0,0001          | sí       |
| sutters-mill          | radiante                | granvik-brown-2018  | 160     | 0           | 0,00185    | 8826 km           | 9425 km          | 0,399 / 0,38             | 0,0207 / 0,022      | 1,57 / 1,5              | 0,0214 / 0,022           | sí       |
| tagish-lake           | radiante                | granvik-brown-2018  | 160     | 0           | 0,00074    | 21.093 km         | 27.526 km        | 0,196 / 0,19             | 0,0436 / 0,045      | 0,94 / 0,97             | 0,0085 / 0,011           | sí       |
| villalbeto-de-la-pena | radiante                | granvik-brown-2018  | 160     | 0           | 0,00105    | 17.952 km         | 21.542 km        | 0,186 / 0,22             | 0,0299 / 0,036      | 0,16 / 0,49             | 0,0067 / 0,0074          | sí       |
| zdar-nad-sazavou      | radiante                | granvik-brown-2018  | 160     | 0           | 0,00011    | 11.669 km         | 11.669 km        | 0,007 / 0,009            | 0,0013 / 0,0015     | 0,01 / 0,02             | 0,0004 / 0,0003          | sí       |

## Entradas y reproducibilidad

Cada nube se reproduce con estas entradas, su semilla (`semillaDe(id)`, FNV-1a de 32 bits del identificador) y `nubeDesdeRadiante` (`src/core/montecarlo.ts`). Las dos últimas columnas comprueban el procedimiento declarado: la σ de los valores que se sortearon de verdad frente a la σ de entrada (1σ). Instante y posición son los de referencia de la estela; altura convencional.

| Pieza                 | Instante (UTC)           | Lat, lon, altura         | α_g ± σ (°)   | δ_g ± σ (°)    | v_g ± σ (km/s)   | Nivel publicado  | Semilla    | σα sorteada / entrada | σδ sorteada / entrada | σv_g sorteada / entrada |
| --------------------- | ------------------------ | ------------------------ | ------------- | -------------- | ---------------- | ---------------- | ---------- | --------------------- | --------------------- | ----------------------- |
| annama                | 2014-04-18T22:14:08.880Z | 68,775, 30,787, 100 km   | 213 ± 0,2     | 8,8 ± 0,4      | 21,45 ± 0,56     | formal-sin-nivel | 2448648953 | 0,201 / 0,2           | 0,379 / 0,4           | 0,4677 / 0,56           |
| benesov               | 1991-05-07T23:03:52.920Z | 49,662, 14,635, 100 km   | 227,62 ± 0,01 | 39,909 ± 0,002 | 18,0807 ± 0,0059 | formal-sin-nivel | 3341756811 | 0,01 / 0,01           | 0,002 / 0,002         | 0,0061 / 0,0059         |
| bunburra-rockhole     | 2007-07-20T19:13:51.960Z | -31,45, 129,827, 100 km  | 80,7 ± 0,05   | -14,22 ± 0,04  | 6,735 ± 0,039    | formal-sin-nivel | 3842661742 | 0,048 / 0,05          | 0,041 / 0,04          | 0,0402 / 0,039          |
| buzzard-coulee        | 2008-11-21T00:26:43.080Z | 53,183, -109,875, 100 km | 290 ± 0,7     | 77 ± 0,3       | 14,19 ± 0,51     | formal-sin-nivel | 529154585  | 0,675 / 0,7           | 0,272 / 0,3           | 0,5054 / 0,51           |
| ejby                  | 2016-02-06T21:04:30.000Z | 55,449, 11,912, 100 km   | 77,74 ± 0,09  | 26,89 ± 0,38   | 9,44 ± 0,15      | formal-sin-nivel | 3774527319 | 0,095 / 0,09          | 0,424 / 0,38          | 0,1516 / 0,15           |
| grimsby               | 2009-09-26T01:02:58.560Z | 43,534, -80,194, 100 km  | 242,6 ± 0,26  | 54,98 ± 0,12   | 17,89 ± 0,22     | formal-sin-nivel | 1942664362 | 0,271 / 0,26          | 0,122 / 0,12          | 0,2055 / 0,22           |
| innisfree             | 1977-02-06T02:17:38.040Z | 53,415, -111,338, 100 km | 7,43 ± 0,3    | 66,52 ± 0,01   | 9,4 ± 0,23       | formal-sin-nivel | 3660280358 | 0,278 / 0,3           | 0,01 / 0,01           | 0,2252 / 0,23           |
| jesenice              | 2009-04-09T00:59:39.840Z | 46,662, 13,692, 100 km   | 159,9 ± 1,2   | 58,7 ± 0,5     | 8,28 ± 0,42      | formal-sin-nivel | 2774619469 | 1,24 / 1,2            | 0,512 / 0,5           | 0,4269 / 0,42           |
| kosice                | 2010-02-28T22:24:46.080Z | 20,705, 48,667, 100 km   | 114,3 ± 1,7   | 29 ± 3         | 10,31 ± 0,44     | formal-sin-nivel | 4275916987 | 1,771 / 1,7           | 2,601 / 3             | 0,3735 / 0,44           |
| krizevci              | 2011-02-04T23:20:39.840Z | 45,733, 16,43, 100 km    | 131,22 ± 0,05 | 19,53 ± 0,04   | 14,456 ± 0,089   | formal-sin-nivel | 2683712980 | 0,051 / 0,05          | 0,042 / 0,04          | 0,0849 / 0,089          |
| lost-city             | 1970-01-04T02:13:59.880Z | 36,005, -95,09, 100 km   | 315 ± 0,1     | 39 ± 0,1       | 9,1984 ± 0,0018  | formal-sin-nivel | 1926967317 | 0,097 / 0,1           | 0,11 / 0,1            | 0,002 / 0,0018          |
| maribo                | 2009-01-17T19:08:27.960Z | 54,585, 13,657, 100 km   | 124,7 ± 1     | 19,7 ± 0,5     | 25,8 ± 0,22      | formal-sin-nivel | 1947553401 | 1,005 / 1             | 0,498 / 0,5           | 0,2141 / 0,22           |
| mason-gully           | 2010-04-13T10:36:12.960Z | -30,275, 128,215, 100 km | 148,36 ± 0,05 | 9 ± 0,05       | 9,324 ± 0,016    | formal-sin-nivel | 3128565087 | 0,053 / 0,05          | 0,053 / 0,05          | 0,0163 / 0,016          |
| moravka               | 2000-05-06T11:51:50.040Z | 50,23, 18,45, 100 km     | 250,1 ± 0,7   | 54,95 ± 0,25   | 19,6 ± 0,23      | formal-sin-nivel | 1957213530 | 0,671 / 0,7           | 0,257 / 0,25          | 0,216 / 0,23            |
| neuschwanstein        | 2002-04-06T20:20:17.880Z | 47,304, 11,552, 100 km   | 192,33 ± 0,03 | 19,55 ± 0,04   | 17,506 ± 0,048   | formal-sin-nivel | 2623917848 | 0,032 / 0,03          | 0,043 / 0,04          | 0,0434 / 0,048          |
| novato                | 2012-10-18T02:44:30.120Z | 36,295, -123,463, 100 km | 268,1 ± 0,5   | -48,9 ± 0,6    | 8,22 ± 0,2       | formal-sin-nivel | 4093885690 | 0,523 / 0,5           | 0,571 / 0,6           | 0,185 / 0,2             |
| park-forest           | 2003-03-27T05:50:26.160Z | 41,13, -87,9, 100 km     | 171,8 ± 1,3   | 11,2 ± 0,5     | 16,05 ± 0,37     | formal-sin-nivel | 3643927573 | 1,42 / 1,3            | 0,508 / 0,5           | 0,3857 / 0,37           |
| peekskill             | 1992-10-09T23:48:00.000Z | 39,663, -78,206, 100 km  | 208,9 ± 0,2   | -29,2 ± 0,3    | 10,09 ± 0,075    | formal-sin-nivel | 3825454215 | 0,214 / 0,2           | 0,337 / 0,3           | 0,0724 / 0,075          |
| pribram               | 1959-04-07T19:30:11.880Z | 49,51, 14,83, 100 km     | 192,34 ± 0,01 | 17,47 ± 0,01   | 17,437 ± 0,012   | formal-sin-nivel | 2098728224 | 0,01 / 0,01           | 0,011 / 0,01          | 0,0116 / 0,012          |
| sutters-mill          | 2012-04-22T14:36:12.960Z | 38,804, -120,908, 100 km | 24 ± 1,3      | 12,7 ± 1,7     | 25,96 ± 0,65     | formal-sin-nivel | 1967505680 | 1,382 / 1,3           | 1,98 / 1,7            | 0,6254 / 0,65           |
| tagish-lake           | 2000-01-18T16:43:41.880Z | 60, -134,2, 100 km       | 90,4 ± 1,9    | 29,9 ± 2,8     | 11,31 ± 0,84     | formal-sin-nivel | 1724939851 | 1,85 / 1,9            | 3 / 2,8               | 0,7739 / 0,84           |
| villalbeto-de-la-pena | 2004-01-04T16:46:45.120Z | 42,771, -4,789, 100 km   | 311,4 ± 1,4   | -18 ± 0,7      | 12,92 ± 0,53     | formal-sin-nivel | 3138913118 | 1,382 / 1,4           | 0,722 / 0,7           | 0,4945 / 0,53           |
| zdar-nad-sazavou      | 2014-12-09T16:16:50.160Z | 49,941, 18,002, 100 km   | 69,31 ± 0,02  | 26,98 ± 0,02   | 18,607 ± 0,035   | formal-sin-nivel | 2989817982 | 0,02 / 0,02           | 0,019 / 0,02          | 0,0329 / 0,035          |

Chelyabinsk (método C): órbita central de Popova et al. con todas sus cifras (q 0.738893, e 0.580953, i 4.928787°, ω 108.301927°, Ω 326.442018°); σ a 1σ de la Tabla S5B: q 0.01, e 0.009, i 0.24°, ω 1.9°, Ω 0.0014°; a = q/(1 − e). Instante de entrada 2013-02-15T03:20:19.800Z; criterio: parámetro de impacto menor o igual que el radio de captura (Tierra de 6371 km más 100 km de atmósfera); semilla 2641236064; 300 órbitas aceptadas de 108.763 sorteos (0,276 %).

Encuentro de las órbitas aceptadas (mínimo, mediana y máximo): parámetro de impacto 4926, 6453 y 7997 km; radio de captura 7873, 7990 y 8111 km; distancia a la Tierra en el instante de entrada 5109, 8003 y 13.342 km. La máxima aproximación de la trayectoria relativa cae entre -5,6 y 11,8 minutos del instante de entrada. Órbita central: parámetro de impacto 5870 km frente a un radio de captura de 7994 km, a 6052 km de la Tierra.

## Centro de la nube frente a la órbita publicada

Mediana de las órbitas de la nube frente al valor central publicado; entre paréntesis, la diferencia en unidades de la σ publicada (1σ).

| Pieza                 | a (au)                 | e                        | i (°)                  | q (au)                   |
| --------------------- | ---------------------- | ------------------------ | ---------------------- | ------------------------ |
| almahata-sitta        | 1,265 / 1,265 (+0,07σ) | 0,2813 / 0,2813 (-0,05σ) | 2,3 / 2,3 (+0σ)        | 0,9094 / 0,9094 (+0,56σ) |
| annama                | 2,065 / 2,08 (-0,12σ)  | 0,6886 / 0,69 (-0,07σ)   | 14,2 / 14,23 (-0,06σ)  | 0,6444 / 0,6436 (+0,15σ) |
| benesov               | 2,483 / 2,483 (+0,3σ)  | 0,6275 / 0,6273 (+0,37σ) | 23,98 / 23,98 (+0,28σ) | 0,9252 / 0,9252 (-0,37σ) |
| bunburra-rockhole     | 0,853 / 0,853 (-0,29σ) | 0,2428 / 0,2425 (+0,21σ) | 8,95 / 8,94 (+0,16σ)   | 0,6457 / 0,6461 (-0,2σ)  |
| buzzard-coulee        | 1,242 / 1,246 (-0,15σ) | 0,226 / 0,228 (-0,11σ)   | 24,99 / 25,07 (-0,1σ)  | 0,961 / 0,9612 (-0,12σ)  |
| chelyabinsk           | 1,768 / 1,76 (+0,1σ)   | 0,5818 / 0,581 (+0,09σ)  | 4,93 / 4,93 (+0,02σ)   | 0,7393 / 0,739 (+0,03σ)  |
| ejby                  | 2,818 / 2,805 (+0,14σ) | 0,6565 / 0,655 (+0,13σ)  | 0,97 / 0,96 (+0,07σ)   | 0,9679 / 0,9677 (+0,28σ) |
| grimsby               | 2,024 / 2,035 (-0,23σ) | 0,5149 / 0,518 (-0,28σ)  | 28,03 / 28,08 (-0,18σ) | 0,9818 / 0,9817 (+0,23σ) |
| innisfree             | 1,863 / 1,866 (-0,05σ) | 0,4708 / 0,472 (-0,08σ)  | 12,22 / 12,25 (-0,12σ) | 0,986 / 0,986            |
| jesenice              | 1,736 / 1,744 (-0,12σ) | 0,4257 / 0,429 (-0,14σ)  | 9,52 / 9,58 (-0,13σ)   | 0,9966 / 0,9965 (+0,11σ) |
| kosice                | 2,767 / 2,73 (+0,16σ)  | 0,6544 / 0,65 (+0,15σ)   | 1,91 / 1,99 (-0,17σ)   | 0,956 / 0,9563 (-0,07σ)  |
| krizevci              | 1,543 / 1,543 (-0,01σ) | 0,5204 / 0,5205 (-0,03σ) | 0,64 / 0,64 (+0,01σ)   | 0,74 / 0,7397 (+0,28σ)   |
| lost-city             | 1,649 / 1,649 (+0,2σ)  | 0,4137 / 0,4133 (+0,3σ)  | 11,94 / 11,94 (-0,04σ) | 0,9671 / 0,9672 (-0,32σ) |
| maribo                | 2,482 / 2,48 (+0,01σ)  | 0,8066 / 0,807 (-0,03σ)  | 0,33 / 0,1 (+0,18σ)    | 0,478 / 0,478 (+0σ)      |
| mason-gully           | 2,561 / 2,557 (+0,44σ) | 0,6165 / 0,6159 (+0,42σ) | 0,89 / 0,9 (-0,04σ)    | 0,982 / 0,982 (+0,2σ)    |
| moravka               | 1,841 / 1,851 (-0,13σ) | 0,4661 / 0,469 (-0,13σ)  | 32,22 / 32,28 (-0,13σ) | 0,9822 / 0,9822 (-0σ)    |
| neuschwanstein        | 2,398 / 2,398 (-0,02σ) | 0,6693 / 0,6693 (+0,01σ) | 11,41 / 11,42 (-0,1σ)  | 0,7931 / 0,793 (+0,26σ)  |
| novato                | 2,091 / 2,091 (+0,01σ) | 0,5276 / 0,528 (-0,02σ)  | 5,5 / 5,52 (-0,2σ)     | 0,9879 / 0,9879 (+0,1σ)  |
| park-forest           | 2,559 / 2,53 (+0,14σ)  | 0,6836 / 0,68 (+0,15σ)   | 3,24 / 3,25 (-0,01σ)   | 0,8112 / 0,8107 (+0,05σ) |
| peekskill             | 1,49 / 1,489 (+0,06σ)  | 0,4057 / 0,4052 (+0,08σ) | 4,88 / 4,88 (-0,03σ)   | 0,8855 / 0,8856 (-0,08σ) |
| pribram               | 2,405 / 2,405 (+0,01σ) | 0,6718 / 0,6717 (+0,1σ)  | 10,49 / 10,48 (+0,3σ)  | 0,7895 / 0,7896 (-0,72σ) |
| sutters-mill          | 2,545 / 2,57 (-0,06σ)  | 0,8212 / 0,823 (-0,08σ)  | 2,24 / 2,4 (-0,11σ)    | 0,459 / 0,456 (+0,14σ)   |
| tagish-lake           | 1,972 / 1,98 (-0,04σ)  | 0,5525 / 0,554 (-0,03σ)  | 2,01 / 2,06 (-0,06σ)   | 0,8849 / 0,884 (+0,08σ)  |
| villalbeto-de-la-pena | 2,309 / 2,3 (+0,04σ)   | 0,6265 / 0,627 (-0,01σ)  | 0,21 / 0,02 (+0,39σ)   | 0,8598 / 0,8596 (+0,03σ) |
| zdar-nad-sazavou      | 2,104 / 2,102 (+0,19σ) | 0,6811 / 0,6808 (+0,23σ) | 2,81 / 2,81 (+0,1σ)    | 0,6708 / 0,6709 (-0,23σ) |

## Chelyabinsk: qué entradas alimentan la nube

Misma semilla y 300 órbitas en cada caso. A es el método de las demás piezas (radiante geocéntrico; antes también el de Chelyabinsk); se repite variando una sola entrada cada vez y con los márgenes de Borovička et al. 2013 (`data/verificacion/borovicka-2013-radiante.json`). B usa el radiante aparente y la velocidad de entrada de Popova et al., de los que dicen haber obtenido los márgenes de su órbita con un Monte Carlo (material suplementario, pág. 18). C, la elegida por el usuario el 2026-10-12, sortea los elementos de la Tabla S5B (1σ) y conserva solo las órbitas que chocan con la Tierra en el instante de entrada en la aproximación de dos cuerpos (parámetro de impacto menor o igual que el radio de captura); también se muestra con el criterio anterior, una distancia geométrica de 15.000 km.

| Caso                                                   | Entradas (1σ)                                           | σa (au) | σe     | σi (°) | σq (au) | σω (°) |
| ------------------------------------------------------ | ------------------------------------------------------- | ------- | ------ | ------ | ------- | ------ |
| A: radiante geocéntrico (Tabla 1)                      | α 333,2 ± 0,8°, δ 0,3 ± 0,9°, v_g 15,3 ± 0,2 km/s       | 0,054   | 0,011  | 0,42   | 0,0065  | 1,34   |
| A: solo α_g                                            | α 333,2 ± 0,8°, δ 0,3 ± 0°, v_g 15,3 ± 0 km/s           | 0,041   | 0,0067 | 0,16   | 0,0054  | 1,2    |
| A: solo δ_g                                            | α 333,2 ± 0°, δ 0,3 ± 0,9°, v_g 15,3 ± 0 km/s           | 0,017   | 0,0019 | 0,37   | 0,0035  | 0,68   |
| A: solo v_g                                            | α 333,2 ± 0°, δ 0,3 ± 0°, v_g 15,3 ± 0,2 km/s           | 0,029   | 0,0082 | 0,06   | 0,0023  | 0,01   |
| Borovička: radiante geocéntrico                        | α 332,82 ± 0,11°, δ 0,28 ± 0,14°, v_g 15,14 ± 0,16 km/s | 0,023   | 0,0066 | 0,08   | 0,002   | 0,19   |
| B: radiante aparente y V∞ (Tabla S5A)                  | α 328,62 ± 0,09°, δ 7,26 ± 0,1°, V∞ 19,16 ± 0,15 km/s   | 0,026   | 0,0072 | 0,15   | 0,0023  | 0,16   |
| C: elementos de la S5B, b ≤ radio de captura (elegida) | q, e, i, ω, Ω con su σ; aceptadas 300 de 108.763        | 0,039   | 0,0088 | 0,24   | 0,0072  | 1,21   |
| C con el criterio anterior (distancia < 15.000 km)     | q, e, i, ω, Ω con su σ; aceptadas 300 de 70.457         | 0,042   | 0,0093 | 0,24   | 0,0074  | 1,28   |
| Publicada: órbita de popova-2013-science (1σ)          | —                                                       | 0,08    | 0,009  | 0,24   | 0,01    | 1,9    |
| Publicada: órbita de borovicka-2013-nature (1σ)        | —                                                       | 0,02    | 0,006  | 0,12   | 0,002   | 0,17   |

- **A.** Con los márgenes del radiante geocéntrico de Popova, la entrada que más dispersión produce en i es δ_g (σi 0,37° de 0,42°), y la nube sale más ancha que la órbita publicada (σa 0,054 frente a 0,08; σe 0,011 frente a 0,009; σi 0,42 frente a 0,24; σq 0,0065 frente a 0,01). Ese margen del radiante (±0,8° a 1σ en la Tabla 1; ±1,0° en el suplemento) es unas diez veces el del radiante aparente (±0,09°).
- **Comprobación del criterio de C con A.** Las órbitas de A no se sortean por elementos: se calculan desde estados de entrada en la atmósfera, así que chocan por construcción. Todas cumplen el criterio de C: parámetro de impacto 7476, 7588 y 7707 km (mínimo, mediana y máximo), frente a un radio de captura de unos 7991 km. En el instante de entrada están a 13.199, 13.883 y 14.716 km de la Tierra: la distancia geométrica no es la magnitud que se compara con el radio de captura.
- **Borovička.** Con su radiante y sus márgenes, la nube da σa 0,023 frente a 0,02; σe 0,0066 frente a 0,006; σi 0,08 frente a 0,12; σq 0,002 frente a 0,002: su par de márgenes, radiante y órbita, es bastante más coherente que el de Popova. Su órbita es osculadora 60 días antes del impacto, así que esta comparación es orientativa.
- **B.** El radiante aparente y la velocidad de entrada de Popova reproducen el centro de su órbita (la estela parte de ellos), pero con sus márgenes la nube sale más estrecha que la órbita publicada (σa 0,0255 frente a 0,08; σe 0,0072 frente a 0,009; σi 0,15 frente a 0,24; σq 0,0023 frente a 0,01). Una explicación posible es que su Monte Carlo incluyera otras fuentes de error que el suplemento no detalla.
- **C (elegida).** Reproduce los márgenes publicados de e e i (σa 0,039 frente a 0,08; σe 0,0088 frente a 0,009; σi 0,24 frente a 0,24; σq 0,0072 frente a 0,01). σq y σω (1,21° frente a 1,9°) salen menores porque el encuentro con la Tierra los restringe, y σa (que la Tabla S5B no da) sale de q y e. Con una propagación lineal, la σa que publica la Tabla 1 (0,08 au) es mayor de lo que admiten σq y σe (0,062 au como máximo, incluso con correlación perfecta); la documentación disponible no explica la diferencia. Se aceptaron 300 de 108.763 sorteos (0,276 %).
- **Criterio anterior.** Con una distancia geométrica menor que 15.000 km en el instante de entrada, 89 de las 300 órbitas aceptadas no chocarían: su parámetro de impacto supera su radio de captura (llega a 11.171 km). La dispersión casi no cambia (σa 0,0422 frente a 0,08; σe 0,0093 frente a 0,009; σi 0,24 frente a 0,24; σq 0,0074 frente a 0,01).

## Cómo leerlo

- La distancia es la que separa la posición de cada órbita del centro de la Tierra en el instante de referencia (con el método `elementos`, la distancia mínima de la elipse). Son órbitas pre-atmosféricas, calculadas sin la atracción de la Tierra en el último tramo, así que es normal que queden a unas decenas de miles de kilómetros: es la desviación que produce la gravedad terrestre. La estela del año previo, que sí la incluye, llega a la posición de referencia.
- Piezas en las que la σ de la nube y la publicada difieren en más de un 40 % en a, e o i: bunburra-rockhole (a), kosice (i), lost-city (a, e), maribo (i), mason-gully (i), moravka (a, e), novato (i), park-forest (i), peekskill (a, e, i), villalbeto-de-la-pena (i), zdar-nad-sazavou (i).
- La σ de la nube sale de propagar la incertidumbre del radiante y de v_g; la publicada es la de la órbita principal (1σ). No tienen por qué coincidir: las fuentes no publican cómo se relacionan sus errores (covarianza), y en algunas los márgenes del radiante y los de la órbita no son coherentes entre sí si se tratan como independientes. Por eso Chelyabinsk usa el método C (sección anterior).
- En Chelyabinsk, cada órbita sorteada se coloca en su punto más cercano a la Tierra en el instante de entrada y se acepta si su parámetro de impacto (la distancia a la que su trayectoria relativa, recta y sin la atracción terrestre, pasaría del centro de la Tierra) no supera el radio de captura r·√(1 + v_esc²/v_g²), con r el radio terrestre más la atmósfera y v_g la velocidad relativa de esa órbita. Es una aproximación de dos cuerpos: no simula el encuentro ni el paso por la atmósfera, y condiciona la geometría de la órbita, no reconstruye la distribución completa de los errores de observación originales.
- Granvik & Brown 2018 no declaran el nivel de la incertidumbre del radiante; se asume 1σ, como en el resto del dataset.
- Cada valor se sortea de una normal con su σ a 1σ: en cada variable, cerca del 31,7 % de las muestras cae fuera de ±1σ, y con tres variables independientes alrededor del 68,2 % tiene al menos una fuera.
- Las nubes muestran la dispersión de este modelo, no una probabilidad calibrada de por dónde pasó cada meteoroide.
