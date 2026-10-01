# Cierre de la Fase 1: MVP Chelyabinsk

Fecha: 2026-10-01. Estado: **completa, pendiente de tu confirmación** para pasar a la Fase 2.

## Criterios de aceptación

| Criterio                                                   | Estado                                                                                                                                               | Evidencia                                                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Globo, transición, órbita animada, punto del bólido, ficha | Cumplido, con la salvedad del punto de caída (abajo)                                                                                                 | `fase-1-recorrido.webm`, capturas `fase-1-*.png`                                                                                    |
| Validación científica aprobada                             | Cumplido                                                                                                                                             | `docs/reportes/chelyabinsk.md`: D_D ≤ 0,045 frente a Popova 2013 y Emel'yanenko 2014 (umbral 0,1), todos los elementos dentro de 3σ |
| 60 fps escritorio / 30 fps móvil                           | Escritorio: 59–60 fps medidos. Móvil: **sin medir en dispositivo real**                                                                              | Medición en el navegador integrado (GPU de escritorio)                                                                              |
| Carga inicial < 3 s en 4G                                  | Cumplido en emulación: texto a los 0,41 s, escena 3D lista a los 2,57 s (1,6 Mbps, 150 ms RTT, CPU ×4)                                               | `npm run e2e:rendimiento`                                                                                                           |
| `prefers-reduced-motion`                                   | Cumplido: corte directo, sin animación larga                                                                                                         | e2e `movimiento reducido`                                                                                                           |
| Accesibilidad: teclado, contraste AA, descripción textual  | Cumplido: 0 violaciones axe (WCAG 2.1 A/AA), recorrido de teclado y retorno de foco probados, descripción textual por vista y por fase del recorrido | `tests/e2e/accesibilidad.spec.ts`                                                                                                   |
| Estado compartible por URL                                 | Cumplido: `?pieza&t&vista&escala`                                                                                                                    | e2e `restaura vista, escala e instante`                                                                                             |

## Qué se hizo, por etapas

0. Andamiaje: Vite + TypeScript + Three.js, esquemas del dataset con validación de fuentes y CI.
1. Núcleo orbital: Kepler, DOPRI5, N cuerpos heliocéntrico, marcos ECEF/EQJ/ECL. Validado contra el `GravitySimulator` de astronomy-engine.
2. Datos de Chelyabinsk con fuente primaria: Popova 2013 (Tabla 1, 2σ), Emel'yanenko 2014 y el registro crudo del CNEOS.
3. Validación científica: órbita calculada desde el vector del CNEOS, Monte Carlo con la incertidumbre de Peña-Asensio 2025 y prueba del marco de referencia con 18 eventos calibrados.
4. Escena 3D: Tierra con la iluminación del instante, sistema solar, nube de 300 órbitas, escala visual/real siempre etiquetada.
5. Recorrido cinematográfico, línea de tiempo, movimiento reducido, estado en la URL y teclado.
6. Ficha como plantilla sin cifras propias; panel con diálogos de ficha y fuentes generados desde `fuentes.json`; texturas WebP; carga diferida de la escena 3D; auditoría de accesibilidad y de rendimiento.

## Pendientes que requieren tu intervención

- **Ficha de Chelyabinsk en estado `borrador`.** Solo se ve en desarrollo. Para publicarla, revísala (`content/fichas/chelyabinsk.md`, o el diálogo "Ficha" con `npm run dev`) y cambia `estado: aprobada` rellenando `revisado_por` y `fecha_revision`.
- **MetBull.** El sitio exige una verificación anti-bots que no se elude. El nombre oficial está en "pendiente" y faltan la masa recuperada y el punto de caída, así que la escena no muestra el punto de caída. Hace falta que copies el registro 57165 o que haya una vía de acceso autorizada.
- **Borovička et al. 2013, Tabla 2** (Nature, de pago). Su órbita solo se usa vía Peña-Asensio 2025, marcada "pendiente".
- **Decisión de hosting** (ver abajo).

## Deuda técnica

- El módulo 3D pesa 700 kB (184 kB con gzip), casi todo Three.js y astronomy-engine. Se puede recortar con imports más finos de Three o con un Web Worker para las efemérides.
- Las incertidumbres de la órbita se tratan como gaussianas independientes; la Tabla 4 de Peña-Asensio da medianas asimétricas de solo 18 eventos.
- No se modela la desaceleración atmosférica antes del pico de brillo.
- Los clones de la nube se mueven con Kepler, sin perturbaciones; solo la órbita nominal usa N cuerpos.
- El panel es alto en pantallas de 720 px: el pie (botones de ficha y fuentes) requiere desplazar el panel.
- La herramienta de vista previa del entorno lee la configuración de la carpeta original de la sesión, así que la verificación visual se hizo con Playwright.
- `@axe-core/playwright` usa licencia MPL-2.0. Es solo de desarrollo y no se distribuye.

## Riesgos

- **Rendimiento en móviles reales.** La emulación usa la GPU del escritorio. Es el riesgo principal antes de la Fase 3, que añade muchos bólidos.
- **Marco de la velocidad del CNEOS.** Las dos interpretaciones (ECEF-relativa e inercial) no se distinguen con los datos disponibles. Afecta poco a la órbita, pero es una incertidumbre sistemática documentada.
- **Eventos del CNEOS anteriores a 2018 o de menos de 0,45 kt.** Su incertidumbre es mucho mayor (D_D mediana 0,31). Hay que decidir en la Fase 3 si se muestran con nubes muy amplias o se omiten.
- **Licencia de la textura Blue Marble.** Está sin verificar: la página de NASA no declara ni licencia ni línea de crédito.
- **Validación automática de nombres contra MetBull (Fase 4).** Puede no ser viable sin acceso autorizado.

## Hosting: opciones

| Opción                         | A favor                                                                                     | En contra                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **GitHub Pages** (recomendada) | Gratis; la GitHub Action diaria del CNEOS (Fase 3) publica en el mismo lugar; gzip incluido | Requiere un repositorio en GitHub; sirve bajo `/<repo>/` (configurar `base` en Vite) |
| Netlify o Cloudflare Pages     | Vistas previas por PR, brotli, cabeceras de caché configurables                             | Otra cuenta que gestionar; la actualización diaria necesita un hook de build         |
| Solo local por ahora           | Sin cuentas                                                                                 | Sin URL para compartir la demo                                                       |

## Cómo reproducir

```
npm ci
npm run datos            # reporte de validación + trayectoria
npm run datos:texturas   # texturas WebP desde el original de NASA
npm test && npm run build && npm run e2e && npm run e2e:rendimiento
npm run cierre:video     # video y capturas de este cierre
```
