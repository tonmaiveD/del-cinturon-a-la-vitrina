# Cierre de la Fase 3: bólidos del CNEOS

Fecha: 2026-10-08. Estado: **completa, pendiente de tu confirmación** para pasar a la Fase 4.

Publicado en https://tonmaived.github.io/del-cinturon-a-la-vitrina/ (modo «Bólidos del CNEOS»).

## Criterios de aceptación

| Criterio del plan                                                        | Estado                                                                                                                                                                                                                                                                                            | Evidencia                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Pipeline del CNEOS, actualización diaria                                 | Cumplido: workflow diario (07:30 UTC; GitHub puede retrasarlo varias horas, como el 2026-10-08, que arrancó a las 14:44). Primera ejecución real el 2026-10-07: 1 evento nuevo y 1 revisado, publicados solos                                                                                     | `.github/workflows/cneos-diario.yml`, commit `2ead4d4` del bot              |
| «Eventos recientes» y fecha de última actualización; nunca «en vivo»     | Cumplido: el panel dice «No son en tiempo real» y muestra la fecha de la última consulta con cambios y la del evento más reciente. Un test prohíbe «en vivo» en cualquier texto; la auditoría comprueba que la fecha mostrada es la de la consulta guardada                                       | `tests/unit/auditoria.test.ts`, `docs/reportes/trazabilidad.md` (sección F) |
| Órbitas Monte Carlo solo para eventos con vector, con la calidad marcada | Cumplido: 260 eventos del grupo fiable (año ≥ 2018 o ≥ 0,45 kt, Tabla 4 de Peña-Asensio et al. 2025), 200 clones cada uno; 258 con nube y 2 no calculables con el motivo. Los 100 del grupo no fiable se muestran **sin órbita** (tu decisión del 2026-10-06), con sus errores típicos publicados | `docs/reportes/cneos.md`                                                    |
| Trayectoria de entrada 3D                                                | Cumplido para los eventos con vector y altura publicados                                                                                                                                                                                                                                          | captura `fase-3-globo-chelyabinsk.png`                                      |
| Comparación de energía con referencias comprensibles                     | Cumplido con una sola referencia, Chelyabinsk, del mismo registro (sin fuentes externas sin leer)                                                                                                                                                                                                 | panel del evento                                                            |
| La incertidumbre se muestra                                              | Cumplido: nube completa en la vista solar (también las órbitas hiperbólicas, sin ocultarlas); mediana y rango del 68 % en el panel; aviso si la nube puede estar sesgada (10 eventos con más del 10 % de simulaciones fallidas)                                                                   | `src/scene/cneos-solar.ts`, `src/cneos/panel.ts`                            |
| Nunca inventar datos                                                     | Cumplido: lo mostrado coincide campo a campo con la respuesta cruda de la API (auditoría, 525 datos, 0 errores); las energías se muestran tal como se publican                                                                                                                                    | `npm run auditoria`                                                         |
| Carga < 3 s en 4G                                                        | Cumplido: carga inicial 2,74–2,82 s (los datos del CNEOS no se descargan al entrar); cambio al modo CNEOS 1,5–2,2 s                                                                                                                                                                               | `npm run e2e:rendimiento`                                                   |
| Accesibilidad                                                            | Cumplido: 0 violaciones axe (WCAG 2.1 A/AA) también en el modo CNEOS; lista de eventos con botones y `aria-pressed`                                                                                                                                                                               | `tests/e2e/accesibilidad.spec.ts`                                           |

## Qué se hizo, por etapas

1. **Datos y órbitas.** Respuesta cruda completa de la API guardada con su fecha; clasificación por fiabilidad verificada contra los 18 eventos calibrados (sin falsos positivos; conservadora: Košice y Baird Bay quedan fuera pese a tener buena órbita); 256 órbitas iniciales con N cuerpos en paralelo (~45 min la primera vez; incremental después).
2. **Escena.** Modo «Bólidos del CNEOS» con carga diferida: globo con los eventos situables (color por calidad, tamaño por energía), panel con detalle, leyenda, filtros y eventos recientes, nube de órbitas en la vista solar, enlace con modo y evento.
3. **Actualización diaria.** Descarga, órbitas incrementales, validación, tests y auditoría **antes** de guardar; commit del bot de GitHub; CI completa reutilizable (e2e y publicación). Si algo falla no se guarda ni se publica nada.
4. **Cierre.** Detalle del evento al principio del panel (antes quedaba fuera de la vista), energías sin redondear, video y capturas.

Además, durante la fase: órbita de **Borovička et al. 2013** leída en el original (PDF aportado por ti), y corrección del rechazo de los push (email no asociado a la cuenta de GitHub).

## Pendientes que requieren tu intervención

- **Ficha de Chelyabinsk** en estado `borrador` (versión legible en `revision/`).
- **MetBull**: los 25 nombres siguen «pendiente de verificación»; faltan masas y puntos de caída (PDF de cada registro en `revision/metbull/`).
- **Rutina**: «Fetch origin» (y «Pull origin» si aparece) antes de cada «Push origin», porque el bot guarda commits.

## Deuda técnica

- **Panel en móvil.** Con dos paneles y bloques plegables funciona, pero deja poco espacio a la escena: conviene un diseño con pestañas u hoja deslizable.
- **Prueba e2e intermitente en GitHub.** Falló dos veces sin reproducirse (2026-10-06 y 2026-10-07). Ahora hay un reintento y las anotaciones públicas dirán cuál es la próxima vez; falta identificarla y corregir la causa.
- **Velocidad en el pico de brillo.** El CNEOS la da en el pico, no en el tope de la atmósfera; las órbitas no corrigen la deceleración previa (igual que en la Fase 1).
- **Recorrido animado solo para Chelyabinsk.** Los clones del CNEOS sí guardan la anomalía media: se podría animar el meteoroide de cualquier evento con órbita (propuesta).
- **Tamaño del repositorio.** Las órbitas ocupan 3,2 MB y crecen con cada evento nuevo (~10 kB por evento con órbita): manejable durante años.
- **Módulo 3D > 500 kB** (aviso de Vite), como en fases anteriores.

## Riesgos

- **Cambios en la API del CNEOS** (formato, campos o revisión de eventos antiguos). Mitigado: el workflow valida el esquema y los tests; si el CNEOS revisa Chelyabinsk, se detiene y no publica.
- **Desactivación del workflow programado** si el repositorio pasa 60 días sin actividad. Improbable con eventos nuevos casi cada semana; se reactiva en la pestaña Actions.
- **Interpretación de las órbitas hiperbólicas** (5 eventos con mayoría de clones hiperbólicos, uno de 2026 a 69 km/s): se muestran sin interpretarlas y con un aviso, pero pueden dar lugar a lecturas sensacionalistas («objeto interestelar»).
- **Criterio de fiabilidad basado en 18 eventos calibrados.** Es el mejor publicado, pero con una muestra pequeña.
- **Rendimiento en móviles de gama baja**: probado de forma cualitativa en un solo teléfono.

## Cómo reproducir

```
npm ci
npm run datos:cneos            # descarga + órbitas (incremental; CNEOS_FRAGMENTO=k/n para paralelizar)
npm run reporte:cneos
npm test && npm run build && npm run e2e && npm run e2e:rendimiento
npm run cierre:fase-3          # video y capturas de este cierre
```

## Actualización posterior al cierre (2026-10-08)

- **Resuelta la deuda «recorrido animado solo para Chelyabinsk»**: las 25 piezas con pedigrí
  tienen recorrido (lotes A, B y C). Detalle y validación en `docs/reportes/trayectorias.md`.
- **Prueba e2e intermitente identificada y corregida**: la de accesibilidad con teclado se
  quedaba sin tiempo en GitHub (ahora 90 s), y otra pulsaba un botón antes de cargar la escena.
- **Retiradas dos copias del video de este cierre** (`fase-3-cneos 2.webm`, `fase-3-cneos 3.webm`)
  creadas por la sincronización de iCloud; el video válido es `fase-3-cneos.webm`.
