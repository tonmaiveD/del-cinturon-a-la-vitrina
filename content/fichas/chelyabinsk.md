---
pieza: chelyabinsk
estado: borrador
redaccion: Claude (manual, fase 1; revisada tras la auditoría consolidada del 2026-10-11), sin generación automática
revisado_por:
fecha_revision:
---

## Qué ocurrió

El {{fecha}}, hacia las {{hora}} UTC, un asteroide pequeño entró en la atmósfera sobre los Urales. Medía unos {{diametro}} m de diámetro y entró a {{v_entrada}} km/s, según la reconstrucción de Popova et al.

Según los sensores del Gobierno de EE. UU. cuyos datos publica el CNEOS, el pico de brillo se produjo a {{alt_pico_cneos}} km de altura, sobre {{lat}} y {{lon}}, cuando el asteroide iba a {{v_pico_cneos}} km/s. Popova et al., que reconstruyeron la trayectoria a partir de videos, sitúan el brillo máximo más arriba, a {{alt_pico_popova}} km, donde el asteroide se rompió. Según el mismo trabajo, sus dos fragmentos principales tuvieron un nuevo destello hacia los {{alt_destello}} km. No se ha establecido si es ese el destello que registró el CNEOS.

El asteroide no llegó entero al suelo: se fragmentó en el aire en varias etapas. El CNEOS estima la energía total del impacto en {{energia_kt}} kilotones de TNT. No es una medida directa, sino el resultado de una fórmula empírica ({{ref_energia}}) aplicada a la energía que el bólido emitió como luz según los sensores (la energía radiada en el óptico), unos {{energia_radiada_kt}} kilotones.

Los fragmentos que llegaron al suelo son meteoritos de tipo **{{clase}}**. Las letras indican una condrita ordinaria pobre en hierro y en metal. El {{tipo_petrologico}} es el tipo petrológico: indica el grado de metamorfismo térmico que sufrió la roca dentro de su cuerpo progenitor, el asteroide mayor del que se desprendió.

## De dónde venía

Antes del choque, el asteroide giraba alrededor del Sol en una órbita con semieje mayor de {{a}} au, excentricidad {{e}} e inclinación de {{i}}° respecto a la eclíptica, el plano de la órbita terrestre. Son los valores que publican Popova et al. En su punto más cercano al Sol (perihelio) pasaba a {{q}} au, cerca de la órbita de Venus; en el más lejano (afelio) llegaba a {{Q}} au, dentro del cinturón principal de asteroides.

Popova et al. aplicaron a esa órbita un modelo estadístico de procedencia ({{modelo_procedencia}}). Según ese modelo, hay tres vías principales por las que pudo llegar desde el cinturón: la {{n_nu6}}, con un {{p_nu6}} %; la {{n_imc}}, con un {{p_imc}} %, y la {{n_31}}, con un {{p_31}} %. El resto se reparte entre el {{n_ob}}, con un {{p_ob}} %, y los {{n_jfc}}, con un {{p_jfc}} %. Son probabilidades de un modelo, no una trayectoria reconstruida hacia atrás.

## Cómo leer la visualización

La órbita se dibuja como una nube y no como una sola línea. Cada línea de la nube es una órbita posible, calculada igual que la estela del último año: se sortean la dirección de llegada (el radiante) y la velocidad que publican Popova et al., y se sigue hacia atrás el movimiento que les corresponde. Por eso todas las órbitas pasan por donde estaba la Tierra en el momento del impacto. La línea más clara es la órbita central que publican.

Cada valor se sortea de una distribución normal centrada en el publicado, con una desviación típica igual a su incertidumbre a {{nivel_nube}}: ±{{ra_sigma1}}° en ascensión recta, ±{{dec_sigma1}}° en declinación y ±{{vg_sigma1}} km/s en la velocidad geocéntrica, que es de {{vg}} km/s. Esa es la velocidad que llevaba respecto a la Tierra antes de que la gravedad terrestre lo acelerara, y por eso es menor que los {{v_entrada}} km/s con que entró en la atmósfera. En cada uno de los tres valores, cerca de un tercio de las muestras cae fuera de su margen, y algo más de dos de cada tres muestras tienen al menos uno de los tres fuera. Popova et al. publican el doble, ±{{ra_sigma}}°, ±{{dec_sigma}}° y ±{{vg_sigma}} km/s, porque dan sus márgenes a {{nivel_radiante}}. Como la fuente no indica cómo se relacionan entre sí esos errores, cada uno se sortea por separado.

La nube que resulta no reproduce exactamente los márgenes que Popova et al. dan para la órbita, de ±{{a_sigma1}} au en el semieje mayor y ±{{i_sigma1}}° en la inclinación a {{nivel_nube}}: es algo más estrecha en el semieje mayor y bastante más ancha en la inclinación. La mayor parte de la anchura en la inclinación viene del margen de la declinación, y la fuente no explica cómo pasó de los márgenes del radiante a los de la órbita. El [reporte de las nubes](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/nubes.md) compara las dos. Donde la nube se ve más densa hay más órbitas sorteadas, pero esa densidad no es una probabilidad calibrada de por dónde pasó el asteroide.

Un cálculo independiente, hecho aquí a partir de la posición y la velocidad que publica el CNEOS, da una órbita compatible con esta si se aplican los errores típicos que {{ref_errores_cneos}} estiman para los bólidos del CNEOS más energéticos o recientes. No es una incertidumbre medida para Chelyabinsk, porque el CNEOS no publica la de cada bólido. El detalle está en el [reporte de validación](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/chelyabinsk.md). Los datos del CNEOS se consultaron el {{cneos_consultado}}.
