---
pieza: chelyabinsk
estado: borrador
redaccion: Claude (manual, fase 1; revisada tras la auditoría consolidada del 2026-10-11 y la auditoría V5 del 2026-10-12), sin generación automática
revisado_por:
fecha_revision:
---

## Qué ocurrió

El {{fecha}}, hacia las {{hora}} UTC, un asteroide pequeño entró en la atmósfera sobre los Urales. Medía unos {{diametro}} m de diámetro y entró en la atmósfera a {{v_entrada}} km/s, según la reconstrucción de Popova et al. Antes de que la gravedad terrestre lo acelerara, su velocidad respecto a la Tierra era de {{vg}} km/s.

Según los sensores del Gobierno de EE. UU. cuyos datos publica el CNEOS, el pico de brillo se produjo a {{alt_pico_cneos}} km de altura, sobre {{lat}} y {{lon}}, cuando el asteroide iba a {{v_pico_cneos}} km/s. Popova et al., que reconstruyeron la trayectoria a partir de videos, sitúan el brillo máximo más arriba, a {{alt_pico_popova}} km, donde el asteroide se rompió. Según el mismo trabajo, sus dos fragmentos principales tuvieron un nuevo destello hacia los {{alt_destello}} km. No se ha establecido si es ese el destello que registró el CNEOS.

El asteroide no llegó entero al suelo: se fragmentó en el aire en varias etapas. El CNEOS estima la energía de impacto total del evento en {{energia_kt}} kilotones de TNT. No es una medida directa, sino el resultado de una fórmula empírica ({{ref_energia}}) aplicada a la energía que el bólido emitió como luz según los sensores (la energía radiada en el óptico), unos {{energia_radiada_kt}} kilotones.

Los fragmentos que llegaron al suelo son meteoritos de tipo **{{clase}}**. Las letras indican una condrita ordinaria pobre en hierro y en metal. El {{tipo_petrologico}} es el tipo petrológico: indica el grado de metamorfismo térmico que sufrió la roca dentro de su cuerpo progenitor, el asteroide mayor del que se desprendió.

## De dónde venía

Antes del choque, el asteroide giraba alrededor del Sol en una órbita con semieje mayor de {{a}} au, excentricidad {{e}} e inclinación de {{i}}° respecto a la eclíptica, el plano de la órbita terrestre. Son los valores que publican Popova et al. En su punto más cercano al Sol (perihelio) pasaba a {{q}} au, cerca de la órbita de Venus; en el más lejano (afelio) llegaba a {{Q}} au, dentro del cinturón principal de asteroides.

Popova et al. aplicaron a esa órbita un modelo estadístico de procedencia ({{modelo_procedencia}}). Según ese modelo, hay tres vías principales por las que pudo llegar desde el cinturón: la {{n_nu6}}, con un {{p_nu6}} %; la {{n_imc}}, con un {{p_imc}} %, y la {{n_31}}, con un {{p_31}} %. El {{p_ob}} % restante corresponde al {{n_ob}}; a los {{n_jfc}} el modelo les asigna un {{p_jfc}} %. Son probabilidades de un modelo, no una trayectoria reconstruida hacia atrás.

## Cómo leer la visualización

La órbita se dibuja como una nube y no como una sola línea. La línea más clara es la órbita que publican Popova et al., con todas las cifras que dan en su material suplementario. La trayectoria del año anterior al impacto (la estela) se calcula con el modelo de integración del proyecto, a partir de las mediciones de entrada que publican Popova et al.: la dirección y la velocidad con que el asteroide entró en la atmósfera, y el punto y la hora de esa entrada.

Cada línea de la nube es una órbita posible. Se sortean los elementos de la órbita publicada, cada uno de una distribución normal centrada en su valor y con una desviación típica igual a su incertidumbre a {{nivel_nube}}: entre otros, ±{{q_sigma1}} au en la distancia del perihelio, ±{{e_sigma1}} en la excentricidad y ±{{i_sigma1}}° en la inclinación. En el artículo esos márgenes aparecen al doble, ±{{q_sigma}} au, ±{{e_sigma}} y ±{{i_sigma}}°, porque allí se dan a {{nivel_orbita}}. En ese sorteo inicial, cerca de un tercio de los valores de cada elemento cae fuera de su margen. Solo se conservan las órbitas que, sin la atracción terrestre, pasarían a menos de unos {{radio_captura}} km del centro de la Tierra, la distancia máxima a la que su gravedad todavía las haría chocar. Cada una se dibuja en su punto más cercano a la Tierra en el momento del impacto. Es un condicionamiento geométrico: no reconstruye la distribución completa de los errores de observación originales.

Popova et al. obtuvieron esos márgenes con un Monte Carlo, a partir de su medición del radiante y de la velocidad. La nube reproduce sus márgenes de excentricidad y de inclinación; en la distancia y la orientación del perihelio sale más estrecha, porque el encuentro con la Tierra las restringe. El semieje mayor se deduce de la distancia del perihelio y de la excentricidad. El margen que el artículo da para él, ±{{a_sigma}} au a {{nivel_orbita}}, es mayor de lo que permiten esos dos márgenes con una propagación lineal, incluso con correlación perfecta, así que la nube no lo reproduce; la documentación disponible no explica la diferencia. El [reporte de las nubes](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/nubes.md) compara este método con otros posibles. Donde la nube se ve más densa hay más órbitas sorteadas, pero esa densidad no es una probabilidad calibrada de por dónde pasó el asteroide.

Un cálculo independiente, hecho aquí a partir de la posición y la velocidad que publica el CNEOS, da una órbita compatible con esta si se aplican los errores típicos que {{ref_errores_cneos}} estiman para los bólidos del CNEOS más energéticos o recientes. No es una incertidumbre medida para Chelyabinsk, porque el CNEOS no publica la de cada bólido. El detalle está en el [reporte de validación](https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/blob/main/docs/reportes/chelyabinsk.md). Los datos del CNEOS se consultaron el {{cneos_consultado}}.
