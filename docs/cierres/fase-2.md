# Cierre de la Fase 2: pedigrí completo

Fecha: 2026-10-05. Estado: **completa y confirmada** por el usuario el 2026-10-06; se pasa a la Fase 3.

## Criterios de aceptación

| Criterio del plan                                        | Estado                                                                                                                                                                                                                                                                         | Evidencia                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Dataset de meteoritos con pedigrí, cada valor con fuente | Cumplido: 25 caídas con órbita instrumental (Granvik y Brown 2018, recalculadas con 1σ) + órbitas adicionales de Popova 2013, Borovička 2015, Spurný 2020, Trigo-Rodríguez 2015 y JPL Horizons                                                                                 | `data/pedigri/*.json`, `npm run validate`                              |
| Verificación cruzada de al menos tres meteoritos         | Cumplido: Žďár nad Sázavou, Annama y Chelyabinsk coinciden dentro de 1,7σ; además, el método reproduce 24 de 25 órbitas de Granvik y Brown. Almahata Sitta discrepa (~140σ) y se resolvió por tu decisión (órbita telescópica de JPL como principal, discrepancia documentada) | `docs/reportes/cruzada.md`                                             |
| Regiones de origen con confianza explícita               | Cumplido, en dos capas que no se mezclan: probabilidad de región de escape (por fuente) y asociación con cuerpo progenitor (alto / medio / especulativo, o sin asociación con motivo)                                                                                          | `data/regiones-escape.json`, `data/regiones-origen.json`               |
| Escena con todas las piezas, instancing y LOD            | Cumplido: 25 marcadores en una sola malla instanciada; 25 nubes de órbitas con dos niveles de detalle por distancia                                                                                                                                                            | capturas `fase-2-*.png`, video `fase-2-catalogo.webm`                  |
| La incertidumbre se muestra                              | Cumplido: cada órbita es una nube muestreada con su σ publicada; las probabilidades llevan banda ±1σ                                                                                                                                                                           | `src/scene/catalogo-solar.ts`, panel de procedencia                    |
| Nunca inventar datos                                     | Cumplido y ahora comprobado automáticamente: la auditoría de trazabilidad contrasta 516 datos mostrados con su origen (0 errores) y prohíbe cifras escritas a mano en los textos                                                                                               | `docs/reportes/trazabilidad.md`, `npm run auditoria` (parte del build) |
| Carga < 3 s en 4G                                        | Cumplido en emulación: escena lista a los 2,72 s (antes 2,57 s)                                                                                                                                                                                                                | `npm run e2e:rendimiento`                                              |
| Accesibilidad                                            | Cumplido: 0 violaciones axe (WCAG 2.1 A/AA) con el panel nuevo; selección de pieza por lista accesible con teclado, además del clic en el globo                                                                                                                                | `tests/e2e/accesibilidad.spec.ts`, `tests/e2e/catalogo.spec.ts`        |

## Qué se hizo, por etapas

1. **Dataset de 25 caídas** importado del LaTeX original de Granvik y Brown 2018 (trayectoria, órbita, probabilidades de escape) con niveles de incertidumbre declarados.
2. **Verificación cruzada** contra fuentes independientes. Se detuvo por el criterio de parada en Almahata Sitta; tu decisión: órbita de JPL como principal, sin inflar incertidumbres.
3. **Regiones de origen**: 7 regiones de escape (solo Hungaria y Phocaea con rangos publicados dibujables; resonancias 3:1, 5:2 y 2:1 por su centro nominal) y 7 asociaciones con progenitor, más 4 caídas sin asociación con su motivo.
4. **Escena con las 25 caídas**: catálogo generado desde `data/`, marcadores seleccionables, nubes de órbitas, contornos de regiones, panel de procedencia en dos capas, filtros por clase y por confianza, `?pieza=` en la URL.

**Cierre:** auditoría de trazabilidad automática (falla el build ante cualquier discrepancia), licencias (MIT para el código, CC BY 4.0 para datos y textos), verificación de la licencia de la textura de NASA y preparación de la publicación en GitHub Pages.

## Correcciones que encontró la auditoría

Antes de la auditoría, cuatro textos de la interfaz llevaban datos escritos a mano: «25 caídas» en la cabecera, «15 de febrero de 2013» en la narración final, «(2013)» en el título de la ficha y la σ de la fecha de Chelyabinsk se omitía sin regla explícita. Los tres primeros ahora salen del dataset; para el cuarto, la auditoría exige la σ de origen solo donde la interfaz muestra incertidumbre (órbitas y probabilidades).

## Pendientes que requieren tu intervención

- ~~Publicación~~: hecho el 2026-10-06 en https://tonmaived.github.io/del-cinturon-a-la-vitrina/ (repositorio `tonmaiveD/del-cinturon-a-la-vitrina`, público; historial reescrito para que los commits usen apaec@yahoo.com).
- **Ficha de Chelyabinsk** en estado `borrador` (sin cambios desde la Fase 1).
- **MetBull**: los 25 nombres siguen marcados «pendiente de verificación»; faltan masas y puntos de caída.
- **Borovička et al. 2013, Tabla 2** (de pago).

## Deuda técnica

- **Recorrido animado solo para Chelyabinsk.** Las órbitas de Granvik y Brown no incluyen la anomalía en la época. Se podría derivar del encuentro con la Tierra en la fecha de caída (cálculo, no dato publicado); queda como propuesta.
- **Covarianza.** Las nubes suponen elementos independientes porque las fuentes no publican la matriz de covarianza (declarado en la descripción). Para las órbitas muy precisas la nube se ve como una línea: es la incertidumbre real, no un error.
- **Regiones aproximadas.** Hungaria y Phocaea se dibujan con sus rangos de a e i; no se representan la excentricidad ni la diferencia entre elementos propios (Phocaea) y osculadores. ν6 y los cometas de la familia de Júpiter no tienen geometría.
- **Rendimiento gráfico.** En un navegador sin GPU, la vista solar baja de 24,7 a 18,7 fps con el catálogo; el coste es de relleno de píxeles. En el móvil real del usuario (2026-10-06) «se ve bien»: valoración cualitativa, sin cifra de fps.
- **Panel en móvil.** El panel inferior y el de pieza dejan poco espacio a la escena en pantallas pequeñas; conviene un diseño de pestañas o una hoja deslizable.
- **Tamaño del módulo 3D** (aviso de Vite > 500 kB), como en la Fase 1.

## Riesgos

- **Rendimiento en móviles**: comprobado de forma cualitativa en un solo teléfono (se ve bien). Sigue sin cifra de fps ni prueba en gama baja; la Fase 3 añade muchos bólidos.
- **Interpretación de probabilidades**: un 72 % de ν6 describe la ruta de escape en un modelo dinámico, no el cuerpo de origen. Se separaron visualmente las dos capas y se explica en el panel, pero sigue siendo fácil de malinterpretar.
- **Asociaciones especulativas** (Hebe, Gefion): se muestran con su confianza y su justificación, incluida la discrepancia de Gefion con las órbitas medidas.
- **Repositorio público**: el código, los datos y el borrador de la ficha quedan visibles en GitHub (la ficha borrador no se publica en el sitio).

## Cómo reproducir

```
npm ci
npm run datos:pedigri       # dataset + catálogo
npm run verificacion:cruzada
npm test && npm run build && npm run e2e && npm run e2e:rendimiento
npm run cierre:fase-2       # video y capturas de este cierre
```
