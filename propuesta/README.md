# Wemul × PRISA Media — Propuesta comercial

Presentación 16:9 implementada desde el diseño `Wemul x PRISA Media.dc.html`
exportado de Claude Design. Recrea el diseño de forma fiel usando el **Wemul
Design System** (tokens de color, tipografía Gabarito/Roboto y espaciado), sin
depender del runtime de Claude Design ni de CDNs: es HTML/CSS/JS puro y
autónomo.

## Archivos de presentación

- **`index.html`** — versión **solo propuesta** (6 slides): la sección PRISA
  desde "Formatos propuestos" en adelante. Es la presentación principal.
- **`presentacion-completa.html`** — el deck completo de **24 slides**
  (sección de agencia 1–18 + propuesta PRISA 19–24), por si se necesita.

## Estructura — solo propuesta (`index.html`)

1. **Formatos propuestos** — separador con las dos líneas de trabajo.
2. **El Chacotero Sentimental** — idea central / punto de partida / nuevo formato.
3. **Propuesta de piloto** — 8 historias premium + componentes + valor/resultado.
4. **PRISA Replay** — "el REC de la radio", con mockup de señal en vivo.
5. **Señal continua** — 3 rutas visuales + modelo comercial.
6. **Cierre de propuesta** — "Una nueva vida para el archivo radial" + contacto.

> El deck completo (`presentacion-completa.html`) añade antes la sección de
> agencia: portada, qué hacemos, números, casos (Sodimac HUM, Bilz y Pap, La
> Roja, Gran Effie), portafolio y "Creamos · Amplificamos · Administramos".

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
index.html               → presentación solo propuesta (6 <section>)
presentacion-completa.html → deck completo de 24 <section>
deck-stage.js     → componente de escenario 16:9 (escalado + navegación)
image-slot.js     → placeholder de imagen rellenable
styles.css        → entry point que importa los tokens
tokens/           → fonts, colors, typography, spacing del Wemul Design System
assets/           → isotipo y lockup Wemul (PNG)
```

> **Nota (del propio design system):** los logos PNG son de baja resolución.
> Para impresión o pantalla grande conviene reemplazarlos por versiones
> vectoriales (SVG/AI) del isotipo y el lockup.
