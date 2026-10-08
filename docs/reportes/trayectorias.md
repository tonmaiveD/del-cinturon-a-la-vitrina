# Trayectorias animadas de las piezas con pedigrí

Generado por `npm run datos:trayectorias`. Cada trayectoria parte del radiante geocéntrico, v_g, instante y posición de referencia publicados (Granvik & Brown 2018) con una **altura convencional de 100 km** (la fuente no publica la altura) y se integra con N cuerpos hacia atrás 365 días. Antes de guardarla, la órbita resultante se contrasta con la órbita principal publicada (criterio de parada: D_D > 0.1 o |z| > 3 en a, e o i). Chelyabinsk tiene su propia trayectoria, calculada desde el vector del CNEOS (Fase 1).

| Pieza | Lote | Origen | Órbita de referencia | Criterio | D_D | z(a) | z(e) | z(i) | Aprobada |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| benesov | a | radiante | granvik-brown-2018 | D_D y z | 0.0002 | 0.46 | 0.51 | 0.25 | sí |
| innisfree | a | radiante | granvik-brown-2018 | D_D y z | 0.0004 | 0.01 | -0.01 | 0.02 | sí |
| lost-city | a | radiante | granvik-brown-2018 | D_D y z | 0.0005 | 0.25 | 0.30 | -0.06 | sí |
| moravka | a | radiante | granvik-brown-2018 | D_D y z | 0.0010 | 0.02 | 0.04 | -0.04 | sí |
| neuschwanstein | a | radiante | granvik-brown-2018 | D_D y z | 0.0001 | 0.06 | 0.07 | -0.03 | sí |
| park-forest | a | radiante | granvik-brown-2018 | D_D y z | 0.0010 | 0.05 | 0.03 | -0.02 | sí |
| peekskill | a | radiante | granvik-brown-2018 | D_D y z | 0.0003 | 0.03 | 0.05 | -0.08 | sí |
| pribram | a | radiante | granvik-brown-2018 | D_D y z | 0.0001 | 0.05 | 0.08 | 0.29 | sí |
| tagish-lake | a | radiante | granvik-brown-2018 | D_D y z | 0.0007 | 0.02 | 0.01 | -0.01 | sí |
| villalbeto-de-la-pena | a | radiante | granvik-brown-2018 | D_D y z | 0.0010 | 0.00 | -0.02 | -0.03 | sí |
| bunburra-rockhole | b | radiante | granvik-brown-2018 | D_D y z | 0.0008 | -0.32 | 0.24 | 0.18 | sí |
| buzzard-coulee | b | radiante | granvik-brown-2018 | D_D y z | 0.0006 | -0.05 | -0.01 | 0.01 | sí |
| grimsby | b | radiante | granvik-brown-2018 | D_D y z | 0.0005 | 0.02 | -0.02 | 0.01 | sí |
| jesenice | b | radiante | granvik-brown-2018 | D_D y z | 0.0004 | 0.02 | 0.00 | 0.00 | sí |
| kosice | b | radiante | granvik-brown-2018 | D_D y z | 0.0005 | 0.02 | 0.00 | 0.01 | sí |
| krizevci | b | radiante | granvik-brown-2018 | D_D y z | 0.0003 | 0.10 | 0.07 | 0.01 | sí |
| maribo | b | radiante | granvik-brown-2018 | D_D y z | 0.0017 | 0.02 | 0.04 | -0.02 | sí |
| mason-gully | b | radiante | granvik-brown-2018 | D_D y z | 0.0005 | 0.46 | 0.45 | -0.02 | sí |
| novato | b | radiante | granvik-brown-2018 | D_D y z | 0.0006 | 0.00 | -0.02 | 0.02 | sí |
| sutters-mill | b | radiante | granvik-brown-2018 | D_D y z | 0.0019 | 0.02 | -0.01 | 0.01 | sí |
| almahata-sitta | c | vector de JPL | jpl-horizons | solo D_D | 0.0003 | 17.25 | 32.42 | 5.70 | sí |
| annama | c | radiante | granvik-brown-2018 | D_D y z | 0.0009 | 0.02 | 0.04 | -0.03 | sí |
| ejby | c | radiante | granvik-brown-2018 | D_D y z | 0.0004 | 0.05 | 0.04 | 0.07 | sí |
| zdar-nad-sazavou | c | radiante | granvik-brown-2018 | D_D y z | 0.0001 | 0.02 | 0.06 | 0.06 | sí |

**Almahata Sitta (2008 TC3)** parte del vector de estado geocéntrico de JPL Horizons, obtenido con observaciones telescópicas antes del impacto, y no del radiante. Se valida solo con D_D (decisión del 2026-10-08): la σ formal de la órbita de JPL (~1e-6) es menor que la precisión de las efemérides de astronomy-engine (su Tierra difiere ~1100 km de la de JPL), por lo que |z| > 3 no indica una discrepancia física. Es el mismo cálculo aceptado en la Fase 2 (docs/reportes/cruzada.md, §B). El criterio se explica en la descripción de la escena.
