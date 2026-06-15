# Videos Prisa

App web que reproduce videos **en vivo de YouTube** y va **rotando
automáticamente** entre los links que le cargás. El audio original de los
videos va en **mudo**: el sonido sale de tus propios archivos de audio
(pensado como una parrilla de programas de radio).

## Características

- **Rotación automática** entre canales con intervalo configurable (por
  defecto, cada 30 s).
- **Controles manuales**: anterior, siguiente y pausar/reanudar la rotación.
- **Audio propio**: subís archivos de audio y se reproducen en loop continuo,
  reemplazando el audio de los videos.
- **Sin build**: HTML/CSS/JS puro. Se abre en cualquier navegador moderno.
- **Persistencia**: los links de video y el intervalo se guardan en el
  navegador (`localStorage`).

## Uso

1. Abrí `index.html` en el navegador (ver más abajo por qué conviene servirlo
   con un servidor local).
2. Pegá uno o más links de YouTube Live en **Canales** y dale *Agregar*.
   Se aceptan los formatos:
   - `https://www.youtube.com/watch?v=ID`
   - `https://youtu.be/ID`
   - `https://www.youtube.com/live/ID`
   - `https://www.youtube.com/embed/ID`
3. Subí tus archivos de audio en **Audio (parrilla)**. Empiezan a sonar y se
   encadenan en loop.
4. Ajustá cada cuántos segundos rota y usá los controles cuando quieras saltar
   manualmente.

> **Nota sobre el audio**: los navegadores bloquean la reproducción automática
> de audio hasta que hay una interacción del usuario (un clic). Si el audio no
> arranca solo, tocá *Reproducir*.

## Servir localmente

La API de YouTube y la reproducción de medios funcionan mejor sobre `http://`
que sobre `file://`. Cualquiera de estos sirve la carpeta:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Luego abrí `http://localhost:8000`.

## Hosting

Al ser estático, se puede publicar en **GitHub Pages**, Netlify, Vercel, etc.
Para GitHub Pages: subí estos archivos a la rama del repo y activá Pages
apuntando a la raíz.

## Roadmap / ideas

- Parrilla programática de audio por horario (ej.: cada programa a su hora).
- Importar/exportar la lista de canales.
- Reordenar canales por drag & drop.
