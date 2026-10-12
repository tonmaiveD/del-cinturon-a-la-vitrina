---
pieza: chelyabinsk
estado: borrador
redaccion: Claude (manual, fase 1; revisada tras la auditoría consolidada del 2026-10-11), sin generación automática
revisado_por:
fecha_revision:
---

## Qué ocurrió

El {{fecha}}, hacia las {{hora}} UTC, un asteroide pequeño entró en la atmósfera sobre los Urales. Medía unos {{diametro}} m de diámetro y entró a {{v_entrada}} km/s, según la reconstrucción de Popova et al.

Los sensores del Gobierno de EE. UU. cuyos datos publica el CNEOS registraron el destello más intenso a {{alt_pico_cneos}} km de altura, sobre {{lat}} y {{lon}}, cuando el asteroide iba a {{v_pico_cneos}} km/s. Popova et al., que reconstruyeron la trayectoria a partir de videos, sitúan el brillo máximo más arriba, a {{alt_pico_popova}} km. Según el mismo trabajo, los dos fragmentos principales que sobrevivieron a esa rotura tuvieron un nuevo destello hacia los {{alt_destello}} km, una altura cercana a la que da el CNEOS.

El asteroide no llegó entero al suelo: estalló en el aire. El CNEOS estima la energía total del impacto en {{energia_kt}} kilotones de TNT. No es una medida directa, sino el resultado de una fórmula empírica ({{ref_energia}}) aplicada a la energía que se vio como luz, unos {{energia_radiada_kt}} kilotones.

Los fragmentos que llegaron al suelo son meteoritos de tipo **{{clase}}**. Las letras indican una condrita ordinaria pobre en hierro y en metal; la cifra es el tipo petrológico, que mide cuánto transformó el calor la roca dentro del asteroide del que procede.

## De dónde venía

Antes del choque, el asteroide giraba alrededor del Sol en una órbita con semieje mayor de {{a}} au, excentricidad {{e}} e inclinación de {{i}}° respecto a la eclíptica, el plano de la órbita terrestre. Son los valores que publican Popova et al. En su punto más cercano al Sol (perihelio) pasaba a {{q}} au, cerca de la órbita de Venus; en el más lejano (afelio) llegaba a {{Q}} au, dentro del cinturón principal de asteroides.

Popova et al. aplicaron a esa órbita un modelo estadístico de procedencia ({{modelo_procedencia}}). Según ese modelo, hay tres vías principales por las que pudo llegar desde el cinturón: la {{n_nu6}}, con un {{p_nu6}} %; la {{n_imc}}, con un {{p_imc}} %, y la {{n_31}}, con un {{p_31}} %. Son probabilidades de un modelo, no una trayectoria reconstruida hacia atrás.

## Cómo leer la visualización

La órbita se dibuja como una nube y no como una sola línea. Cada línea de la nube es una órbita posible, calculada igual que la estela del último año: se sortean la dirección de llegada (el radiante) y la velocidad que publican Popova et al., y se sigue hacia atrás el movimiento que les corresponde. Por eso todas las órbitas pasan por donde estaba la Tierra en el momento del impacto. La línea más clara es la órbita central que publican.

Cada valor se sortea de una distribución normal centrada en el publicado, con una desviación típica igual a su incertidumbre a {{nivel_nube}}: ±{{ra_sigma1}}° en ascensión recta, ±{{dec_sigma1}}° en declinación y ±{{vg_sigma1}} km/s en la velocidad. Por eso cerca de un tercio de las muestras cae fuera de ese margen. Popova et al. publican el doble, ±{{ra_sigma}}°, ±{{dec_sigma}}° y ±{{vg_sigma}} km/s, porque dan sus márgenes a {{nivel_radiante}}. Como la fuente no indica cómo se relacionan entre sí esos errores, cada uno se sortea por separado.

La nube que resulta no reproduce exactamente los márgenes que Popova et al. dan para la órbita, de ±{{a_sigma1}} au en el semieje mayor y ±{{i_sigma1}}° en la inclinación a {{nivel_nube}}: es algo más estrecha en el semieje mayor y bastante más ancha en la inclinación. El [reporte de las nubes](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/nubes.md) compara las dos. Donde la nube se ve más densa hay más órbitas sorteadas, pero esa densidad no es una probabilidad calibrada de por dónde pasó el asteroide.

Un cálculo independiente, hecho aquí a partir de la posición y la velocidad que publica el CNEOS, da una órbita compatible con esta dentro del margen de error de esos datos. El detalle está en el [reporte de validación](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/chelyabinsk.md). Los datos del CNEOS se consultaron el {{cneos_consultado}}.
