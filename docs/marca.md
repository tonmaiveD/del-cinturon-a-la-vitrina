# Adaptar la web a la marca de la tienda

Desde el 2026-10-21 (M35) todos los colores de marca y la tipografía están en un solo archivo,
`src/tema.ts`. Cambiar un valor ahí cambia los paneles y la escena 3D a la vez; la leyenda de
capas toma los mismos colores que lo dibujado, así que no pueden quedar distintos.

## Qué hace falta de la tienda

- **Colores**: fondo, texto, acento (botones activos e interruptores), avisos, enlaces. Mejor en
  hexadecimal (`#ffb25c`).
- **Tipografía**: el nombre de la fuente y, si no es de sistema, el archivo o el enlace con su
  licencia de uso web.
- **Logo** (SVG o PNG de alta resolución) y el texto de cabecera, si debe nombrar a la tienda.

Con eso se cambian los valores de `TEMA.interfaz` y, si se quiere, los de `TEMA.capas`.

## Qué comprueba el build

- La prueba de accesibilidad (axe, WCAG 2.1 AA) falla si una combinación de colores no tiene
  contraste suficiente: una paleta de marca que no lo cumpla no se publica.
- Un test exige que cada variable CSS usada exista en el tema y que la escena no escriba colores
  de capa a mano.

## Iluminación «Siempre de día»

El globo se muestra por defecto con una luz de presentación: la cara visible está iluminada
aunque en ese instante allí fuera de noche. Como no es la posición real del Sol, se rotula en un
aviso y en la descripción accesible, y el interruptor «Siempre de día» vuelve a la luz real
(`?luz=real` en la URL). La vista del sistema solar siempre usa el Sol real.
