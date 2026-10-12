# Nubes de órbitas de las piezas con pedigrí

Generado por `npm run datos:nubes` (`pipeline/nubes-pedigri.ts`) el 2026-10-12. No editar a mano.

## Método

Para cada pieza se sortean el radiante geocéntrico (α_g, δ_g) y la velocidad geocéntrica v_g publicados, con distribuciones normales independientes de desviación típica igual a su incertidumbre a 1σ, y cada clon se integra con N cuerpos desde la posición e instante de referencia (altura convencional de 100 km), igual que la estela del año previo; los elementos son los pre-atmosféricos en ese instante. Almahata Sitta: sorteo de los elementos de su órbita telescópica de JPL (σ formal).

Criterio de parada por pieza: el radiante central reproduce la órbita principal (D_D ≤ 0.1), todas las órbitas pasan a menos de 0.002 au (299.196 km) de la Tierra en el instante de referencia y se descarta como mucho el 10 % de los sorteos (órbitas no elípticas).

Hasta el 2026-10-12 cada nube sorteaba los elementos orbitales por separado. Con ese método, en 21 de las 25 piezas menos de la mitad de las órbitas pasaba a menos de 0,002 au de la Tierra (en Chelyabinsk, el 6 %; en Maribo y Villalbeto de la Peña, ninguna).

## Resultado

| Pieza                 | Método    | Fuente              | Órbitas | Descartadas | D_D centro | Distancia mediana | Distancia máxima | σa nube / publicada (au) | σe nube / publicada | σi nube / publicada (°) | σq nube / publicada (au) | Aprobada |
| --------------------- | --------- | ------------------- | ------- | ----------- | ---------- | ----------------- | ---------------- | ------------------------ | ------------------- | ----------------------- | ------------------------ | -------- |
| almahata-sitta        | elementos | jpl-horizons        | 160     | 0           | —          | 60.138 km         | 63.280 km        | 0 / 0                    | 0 / 0               | 0 / 0                   | 0 / 0                    | sí       |
| annama                | radiante  | granvik-brown-2018  | 160     | 0           | 0,00091    | 10.621 km         | 11.070 km        | 0,101 / 0,13             | 0,0168 / 0,021      | 0,36 / 0,49             | 0,0056 / 0,0054          | sí       |
| benesov               | radiante  | granvik-brown-2018  | 160     | 0           | 0,00017    | 13.613 km         | 13.763 km        | 0,002 / 0,002            | 0,0003 / 0,0004     | 0,01 / 0,01             | 0 / 0,0001               | sí       |
| bunburra-rockhole     | radiante  | granvik-brown-2018  | 160     | 0           | 0,00082    | 48.171 km         | 49.367 km        | 0,001 / 0,001            | 0,0012 / 0,0014     | 0,06 / 0,07             | 0,0014 / 0,0019          | sí       |
| buzzard-coulee        | radiante  | granvik-brown-2018  | 160     | 0           | 0,00057    | 17.653 km         | 19.897 km        | 0,024 / 0,029            | 0,0146 / 0,018      | 0,8 / 0,78              | 0,0011 / 0,0015          | sí       |
| chelyabinsk           | radiante  | popova-2013-science | 160     | 0           | 0,00097    | 13.913 km         | 14.661 km        | 0,054 / 0,08             | 0,011 / 0,009       | 0,42 / 0,24             | 0,0065 / 0,01            | sí       |
| ejby                  | radiante  | granvik-brown-2018  | 160     | 0           | 0,00041    | 30.368 km         | 32.014 km        | 0,094 / 0,094            | 0,0117 / 0,012      | 0,11 / 0,1              | 0,0003 / 0,0006          | sí       |
| grimsby               | radiante  | granvik-brown-2018  | 160     | 0           | 0,0005     | 13.314 km         | 13.763 km        | 0,043 / 0,048            | 0,0103 / 0,011      | 0,25 / 0,28             | 0,0005 / 0,0003          | sí       |
| innisfree             | radiante  | granvik-brown-2018  | 160     | 0           | 0,00043    | 30.967 km         | 33.211 km        | 0,047 / 0,051            | 0,0133 / 0,014      | 0,24 / 0,22             | 0 / 0                    | sí       |
| jesenice              | radiante  | granvik-brown-2018  | 160     | 0           | 0,00037    | 36.951 km         | 45.328 km        | 0,083 / 0,068            | 0,0269 / 0,023      | 0,42 / 0,48             | 0,0006 / 0,0007          | sí       |
| kosice                | radiante  | granvik-brown-2018  | 160     | 0           | 0,00052    | 25.432 km         | 29.172 km        | 0,241 / 0,23             | 0,0301 / 0,03       | 0,7 / 0,47              | 0,0031 / 0,0042          | sí       |
| krizevci              | radiante  | granvik-brown-2018  | 160     | 0           | 0,00025    | 17.204 km         | 17.503 km        | 0,008 / 0,009            | 0,0033 / 0,0034     | 0,02 / 0,03             | 0,0011 / 0,0012          | sí       |
| lost-city             | radiante  | granvik-brown-2018  | 160     | 0           | 0,00048    | 29.920 km         | 30.069 km        | 0,002 / 0,004            | 0,0007 / 0,0013     | 0,02 / 0,03             | 0,0001 / 0,0002          | sí       |
| maribo                | radiante  | granvik-brown-2018  | 160     | 0           | 0,00166    | 9125 km           | 9275 km          | 0,194 / 0,27             | 0,0113 / 0,015      | 0,31 / 1,3              | 0,0117 / 0,018           | sí       |
| mason-gully           | radiante  | granvik-brown-2018  | 160     | 0           | 0,00051    | 30.518 km         | 30.817 km        | 0,009 / 0,009            | 0,0013 / 0,0014     | 0,01 / 0,03             | 0,0001 / 0,0002          | sí       |
| moravka               | radiante  | granvik-brown-2018  | 160     | 0           | 0,00099    | 10.771 km         | 11.070 km        | 0,044 / 0,079            | 0,0127 / 0,022      | 0,31 / 0,42             | 0,001 / 0,0038           | sí       |
| neuschwanstein        | radiante  | granvik-brown-2018  | 160     | 0           | 0,00013    | 13.314 km         | 13.613 km        | 0,014 / 0,017            | 0,0021 / 0,0024     | 0,03 / 0,03             | 0,0004 / 0,0004          | sí       |
| novato                | radiante  | granvik-brown-2018  | 160     | 0           | 0,00061    | 34.258 km         | 37.848 km        | 0,06 / 0,079             | 0,0135 / 0,018      | 0,16 / 0,11             | 0,0004 / 0,0004          | sí       |
| park-forest           | radiante  | granvik-brown-2018  | 160     | 0           | 0,00105    | 15.109 km         | 16.157 km        | 0,208 / 0,21             | 0,0243 / 0,025      | 0,36 / 0,66             | 0,009 / 0,0098           | sí       |
| peekskill             | radiante  | granvik-brown-2018  | 160     | 0           | 0,00033    | 23.337 km         | 24.235 km        | 0,009 / 0,015            | 0,0037 / 0,0055     | 0,09 / 0,15             | 0,0013 / 0,0018          | sí       |
| pribram               | radiante  | granvik-brown-2018  | 160     | 0           | 0,00005    | 13.165 km         | 13.314 km        | 0,004 / 0,004            | 0,0005 / 0,0006     | 0,01 / 0,01             | 0,0001 / 0,0001          | sí       |
| sutters-mill          | radiante  | granvik-brown-2018  | 160     | 0           | 0,00185    | 8826 km           | 9425 km          | 0,399 / 0,38             | 0,0207 / 0,022      | 1,57 / 1,5              | 0,0214 / 0,022           | sí       |
| tagish-lake           | radiante  | granvik-brown-2018  | 160     | 0           | 0,00074    | 21.093 km         | 27.526 km        | 0,196 / 0,19             | 0,0436 / 0,045      | 0,94 / 0,97             | 0,0085 / 0,011           | sí       |
| villalbeto-de-la-pena | radiante  | granvik-brown-2018  | 160     | 0           | 0,00105    | 18.101 km         | 21.392 km        | 0,186 / 0,22             | 0,0299 / 0,036      | 0,16 / 0,49             | 0,0067 / 0,0074          | sí       |
| zdar-nad-sazavou      | radiante  | granvik-brown-2018  | 160     | 0           | 0,00011    | 11.669 km         | 11.669 km        | 0,007 / 0,009            | 0,0013 / 0,0015     | 0,01 / 0,02             | 0,0004 / 0,0003          | sí       |

## Cómo leerlo

- La distancia es la que separa la posición de cada órbita del centro de la Tierra en el instante de referencia (con el método `elementos`, la distancia mínima de la elipse). Son órbitas pre-atmosféricas, calculadas sin la atracción de la Tierra en el último tramo, así que es normal que queden a unas decenas de miles de kilómetros: es la desviación que produce la gravedad terrestre. La estela del año previo, que sí la incluye, llega a la posición de referencia.
- Piezas en las que la σ de la nube y la publicada difieren en más de un 40 % en a, e o i: bunburra-rockhole (a), chelyabinsk (a, i), kosice (i), lost-city (a, e), maribo (i), mason-gully (i), moravka (a, e), novato (i), park-forest (i), peekskill (a, e, i), villalbeto-de-la-pena (i), zdar-nad-sazavou (i).
- La σ de la nube sale de propagar la incertidumbre del radiante y de v_g; la publicada es la de la órbita principal (1σ). No tienen por qué coincidir: las fuentes no publican cómo se relacionan sus errores (covarianza), y en algunas los márgenes del radiante y los de la órbita no son coherentes entre sí si se tratan como independientes. En Chelyabinsk, con los márgenes de Popova et al. (publicados a 2σ y convertidos aquí a 1σ), la nube es más estrecha en a y más ancha en i que la órbita publicada.
- Granvik & Brown 2018 no declaran el nivel de la incertidumbre del radiante; se asume 1σ, como en el resto del dataset.
- Las nubes muestran la dispersión de este modelo, no una probabilidad calibrada de por dónde pasó cada meteoroide.
