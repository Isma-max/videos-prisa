/* ============================================================
   <image-slot> — user-fillable image placeholder.

   Self-contained recreation of the Claude Design image-slot used by
   "Wemul x PRISA Media.dc.html". Renders a tasteful empty-state
   placeholder (pixel-block motif + caption) and lets the presenter
   fill it by clicking to browse or dragging an image file onto it.
   Filled images persist in localStorage per slot id, so they survive
   reloads. No server / sidecar required.

   Attributes:
     id           Persistence key (required for the fill to survive reload).
     shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
     radius       Corner radius in px for 'rounded'.        (default 12)
     fit          object-fit: cover | contain | fill.       (default 'cover')
     placeholder  Empty-state caption.
     src          Optional initial/fallback image URL.
   ============================================================ */
(() => {
  const KEY_PREFIX = 'wemul-prisa-image-slot:';
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];

  class ImageSlot extends HTMLElement {
    connectedCallback() {
      if (this._wired) return;
      this._wired = true;

      const shape = this.getAttribute('shape') || 'rounded';
      const radius = this.getAttribute('radius') || '12';
      const fit = this.getAttribute('fit') || 'cover';
      const caption = this.getAttribute('placeholder') || 'Imagen';
      const bg = 'var(--is-bg, var(--ink-50, #f3f5f7))';

      let br = radius + 'px';
      if (shape === 'rect') br = '0';
      else if (shape === 'circle') br = '50%';
      else if (shape === 'pill') br = '999px';

      this.style.display = 'block';
      this.style.position = this.style.position || 'relative';
      this.style.overflow = 'hidden';
      this.style.borderRadius = br;
      this.style.background = bg;
      this.style.cursor = 'pointer';
      this.style.userSelect = 'none';
      this._fit = fit;

      this.innerHTML = `
        <div class="is-empty" style="position:absolute;inset:0;display:flex;flex-direction:column;
            align-items:center;justify-content:center;gap:14px;text-align:center;padding:18px;
            box-sizing:border-box;color:var(--text-faint,#8492a0);
            border:2px dashed color-mix(in srgb, currentColor 38%, transparent);border-radius:inherit;">
          <div aria-hidden="true" style="display:grid;grid-template-columns:repeat(3,10px);
              grid-auto-rows:10px;gap:4px;opacity:.65;">
            <span style="background:var(--coral-500,#FF403E);border-radius:2px;"></span><span></span>
            <span style="background:var(--blue-500,#0081FE);border-radius:2px;"></span>
            <span></span><span style="background:var(--wemul-sky,#82C4FF);border-radius:2px;"></span><span></span>
            <span style="background:var(--blue-500,#0081FE);border-radius:2px;"></span><span></span>
            <span style="background:var(--coral-500,#FF403E);border-radius:2px;"></span>
          </div>
          <span class="is-caption" style="font-family:var(--font-text,system-ui);font-weight:600;
              font-size:14px;line-height:1.35;max-width:90%;">${caption}</span>
          <span style="font-family:var(--font-text,system-ui);font-weight:500;font-size:11px;
              letter-spacing:.08em;text-transform:uppercase;opacity:.7;">Clic o arrastra una imagen</span>
        </div>`;

      this._input = document.createElement('input');
      this._input.type = 'file';
      this._input.accept = ACCEPT.join(',');
      this._input.style.display = 'none';
      this.appendChild(this._input);

      this.addEventListener('click', (e) => {
        if (e.target === this._input) return;
        this._input.click();
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._readFile(f);
      });
      this.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.style.outline = '3px solid var(--blue-500,#0081FE)';
      });
      this.addEventListener('dragleave', () => (this.style.outline = ''));
      this.addEventListener('drop', (e) => {
        e.preventDefault();
        this.style.outline = '';
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && ACCEPT.includes(f.type)) this._readFile(f);
      });

      // Restore a previously dropped image, or use the src fallback.
      const saved = this.id ? localStorage.getItem(KEY_PREFIX + this.id) : null;
      if (saved) this._fill(saved);
      else if (this.getAttribute('src')) this._fill(this.getAttribute('src'), false);
    }

    _readFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        this._fill(url);
        if (this.id) {
          try {
            localStorage.setItem(KEY_PREFIX + this.id, url);
          } catch (_) {
            /* quota / private mode — image still shows this session */
          }
        }
      };
      reader.readAsDataURL(file);
    }

    _fill(url, persist) {
      const empty = this.querySelector('.is-empty');
      if (empty) empty.style.display = 'none';
      let img = this.querySelector('img.is-img');
      if (!img) {
        img = document.createElement('img');
        img.className = 'is-img';
        img.alt = this.getAttribute('placeholder') || '';
        img.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;object-fit:' +
          this._fit +
          ';border-radius:inherit;display:block;';
        this.appendChild(img);
      }
      img.src = url;
    }
  }

  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
