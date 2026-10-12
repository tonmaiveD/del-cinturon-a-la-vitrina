# Cobertura de las nubes de órbitas del CNEOS

Generado por `npm run validacion:cobertura` (`pipeline/cobertura-cneos.ts`). 200 clones por evento y método, semilla fija.

La nube de cada bólido se construye con los errores típicos de la Tabla 4 de Peña-Asensio et al. (2025) para el grupo fiable (σ = mediana / 0,6745): velocidad 0.815 km/s, α_g 2.002°, δ_g 1.245°. Aquí se comprueba, con los eventos calibrados del mismo estudio que pertenecen a ese grupo (12 de 18), si la órbita medida desde tierra cae dentro del rango central del 68 % y del 95 % de los clones en a, e, i y q.

## Resultado

| Método                                            | Dentro del 68 % | Dentro del 95 % |
| ------------------------------------------------- | --------------- | --------------- |
| Anterior: errores sobre el vector aparente (ECEF) | 37/48 (77 %)    | 44/48 (92 %)    |
| Actual: errores sobre el radiante geocéntrico     | 35/48 (73 %)    | 45/48 (94 %)    |

Si las nubes estuvieran bien calibradas, cabría esperar alrededor del 68 % y del 95 %.

## Por evento

| Evento      | Fecha      | kt   | Clones (anterior / actual) | 68 % anterior | 68 % actual | 95 % anterior | 95 % actual |
| ----------- | ---------- | ---- | -------------------------- | ------------- | ----------- | ------------- | ----------- |
| 2008 TC3    | 2008-10-07 | 1    | 200 / 200                  | a, e, i, q    | a, e, i     | a, e, i, q    | a, e, i, q  |
| Chelyabinsk | 2013-02-15 | 440  | 200 / 200                  | a, e, i, q    | a, e, q     | a, e, i, q    | a, e, i, q  |
| 2018 LA     | 2018-06-02 | 0.98 | 200 / 200                  | a, e, i, q    | a, e, i, q  | a, e, i, q    | a, e, i, q  |
| Ozerki      | 2018-06-21 | 2.8  | 200 / 200                  | a, e, i, q    | a, e, i, q  | a, e, i, q    | a, e, i, q  |
| Viñales     | 2019-02-01 | 1.4  | 200 / 200                  | a, e, q       | a, e, q     | a, e, q       | a, e, i, q  |
| 2019 MO     | 2019-06-22 | 6    | 200 / 200                  | a, e          | a, e        | a, e          | a, e        |
| Flensburg   | 2019-09-12 | 0.48 | 200 / 200                  | i, q          | i, q        | a, e, i, q    | a, e, i, q  |
| Novo Mesto  | 2020-02-28 | 0.34 | 200 / 200                  | a, e, i, q    | a, e, i, q  | a, e, i, q    | a, e, i, q  |
| Ådalen      | 2020-11-07 | 0.33 | 200 / 200                  | a, e, i, q    | a, e, i, q  | a, e, i, q    | a, e, i, q  |
| 2022 EB5    | 2022-03-11 | 4    | 200 / 200                  | ninguno       | ninguno     | a, e, i       | a, e, i     |
| Iberian     | 2024-05-18 | 0.13 | 200 / 200                  | a, e, i, q    | a, e, i, q  | a, e, i, q    | a, e, i, q  |
| 2024 RW1    | 2024-09-04 | 0.2  | 200 / 200                  | a, i          | a, i        | a, e, i, q    | a, e, i, q  |

## Cómo leerlo

- Es una validación dentro de la muestra: estos mismos eventos sirvieron para medir los errores típicos, y son pocos. Orienta sobre si la nube es razonable; no certifica que el rango sea una probabilidad calibrada para un evento concreto.
- Los elementos a, e, i y q de un mismo evento no son independientes, así que los 48 casos no son 48 pruebas independientes.
- Los vectores son los de la revisión del CNEOS que usaron los autores, que puede diferir de la actual.
- Por todo ello la web describe el rango como «el 68 % central de las órbitas de este modelo», no como la probabilidad de la órbita real.
