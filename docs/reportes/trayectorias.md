# Trayectorias animadas de las piezas con pedigrí

Generado por `npm run datos:trayectorias`. Cada trayectoria parte del radiante geocéntrico, v_g, instante y posición de referencia publicados (Granvik & Brown 2018) con una **altura convencional de 100 km** (la fuente no publica la altura) y se integra con N cuerpos hacia atrás 365 días. Antes de guardarla, la órbita resultante se contrasta con la órbita principal publicada (criterio de parada: D_D > 0.1 o |z| > 3 en a, e o i). Chelyabinsk tiene su propia trayectoria, calculada desde el vector del CNEOS (Fase 1).

| Pieza | Lote | Órbita de referencia | D_D | z(a) | z(e) | z(i) | Aprobada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| benesov | a | granvik-brown-2018 | 0.0002 | 0.46 | 0.51 | 0.25 | sí |
| innisfree | a | granvik-brown-2018 | 0.0004 | 0.01 | -0.01 | 0.02 | sí |
| lost-city | a | granvik-brown-2018 | 0.0005 | 0.25 | 0.30 | -0.06 | sí |
| moravka | a | granvik-brown-2018 | 0.0010 | 0.02 | 0.04 | -0.04 | sí |
| neuschwanstein | a | granvik-brown-2018 | 0.0001 | 0.06 | 0.07 | -0.03 | sí |
| park-forest | a | granvik-brown-2018 | 0.0010 | 0.05 | 0.03 | -0.02 | sí |
| peekskill | a | granvik-brown-2018 | 0.0003 | 0.03 | 0.05 | -0.08 | sí |
| pribram | a | granvik-brown-2018 | 0.0001 | 0.05 | 0.08 | 0.29 | sí |
| tagish-lake | a | granvik-brown-2018 | 0.0007 | 0.02 | 0.01 | -0.01 | sí |
| villalbeto-de-la-pena | a | granvik-brown-2018 | 0.0011 | 0.00 | -0.02 | -0.03 | sí |
| bunburra-rockhole | b | granvik-brown-2018 | 0.0008 | -0.32 | 0.24 | 0.18 | sí |
| buzzard-coulee | b | granvik-brown-2018 | 0.0006 | -0.05 | -0.01 | 0.01 | sí |
| grimsby | b | granvik-brown-2018 | 0.0005 | 0.02 | -0.02 | 0.01 | sí |
| jesenice | b | granvik-brown-2018 | 0.0004 | 0.02 | 0.00 | 0.00 | sí |
| kosice | b | granvik-brown-2018 | 0.0005 | 0.02 | 0.00 | 0.01 | sí |
| krizevci | b | granvik-brown-2018 | 0.0002 | 0.10 | 0.07 | 0.01 | sí |
| maribo | b | granvik-brown-2018 | 0.0017 | 0.02 | 0.04 | -0.02 | sí |
| mason-gully | b | granvik-brown-2018 | 0.0005 | 0.46 | 0.45 | -0.02 | sí |
| novato | b | granvik-brown-2018 | 0.0006 | 0.00 | -0.02 | 0.02 | sí |
| sutters-mill | b | granvik-brown-2018 | 0.0019 | 0.02 | -0.01 | 0.01 | sí |
