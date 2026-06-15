# Wemul × PRISA Media — Propuesta comercial

Presentación 16:9 (24 slides) implementada desde el diseño
`Wemul x PRISA Media.dc.html` exportado de Claude Design. Recrea el diseño
de forma fiel usando el **Wemul Design System** (tokens de color, tipografía
Gabarito/Roboto y espaciado), sin depender del runtime de Claude Design ni de
CDNs: es HTML/CSS/JS puro y autónomo.

## Estructura

- **Agencia (slides 1–18):** portada, qué hacemos, números de impacto,
  separador "Nuestra experiencia", casos (Sodimac HUM, estrategia que escala,
  Bilz y Pap, La Roja, Gran Effie), transición a portafolio + 4 grillas de
  cards (retail, marcas, medios/gobierno, cultura pop), amplificación,
  nuestras redes, sistema "Creamos · Amplificamos · Administramos" y cierre.
- **Propuesta PRISA (slides 19–24):** separador con las dos líneas de trabajo,
  El Chacotero Sentimental, piloto de 8 historias, PRISA Replay ("el REC de la
  radio"), señal continua con 3 rutas + modelo comercial, y cierre.

## Uso

Abre `index.html` con un servidor estático (o directamente en el navegador):

```bash
cd propuesta
python3 -m http.server 8000   # luego abre http://localhost:8000
```

### Navegación

- **← / →**, **PgUp / PgDn**, **Espacio** — slide anterior / siguiente.
- **Home / End** — primera / última slide.
- **1–9** — saltar a una slide.
- **R** — volver a la portada.
- **Clic** en la mitad izquierda/derecha — anterior / siguiente.
- **Imprimir → Guardar como PDF** genera una página por slide (16:9).

### Placeholders de imagen

Las slides incluyen 30 marcadores `<image-slot>` (capturas de canales,
personajes, mockups de señal en vivo, logos, etc.). Haz **clic** sobre uno o
**arrastra** una imagen encima para rellenarlo; la imagen se guarda en
`localStorage` y persiste entre recargas en el mismo navegador.

## Archivos

```
index.html        → la presentación (24 <section> dentro de <deck-stage>)
deck-stage.js     → componente de escenario 16:9 (escalado + navegación)
image-slot.js     → placeholder de imagen rellenable
styles.css        → entry point que importa los tokens
tokens/           → fonts, colors, typography, spacing del Wemul Design System
assets/           → isotipo y lockup Wemul (PNG)
```

> **Nota (del propio design system):** los logos PNG son de baja resolución.
> Para impresión o pantalla grande conviene reemplazarlos por versiones
> vectoriales (SVG/AI) del isotipo y el lockup.
