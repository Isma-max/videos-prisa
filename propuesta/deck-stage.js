/* ============================================================
   <deck-stage> — vanilla 16:9 presentation stage.

   Self-contained recreation of the Claude Design deck-stage used
   by "Wemul x PRISA Media.dc.html". No React / CDN runtime.

   Handles:
     - a fixed 1920×1080 design canvas scaled with transform:scale()
       to fit the viewport, letterboxed on a black backdrop;
     - slides are the direct <section> children, absolutely stacked
       (only the active one is visible — others stay mounted);
     - keyboard nav: ←/→, PgUp/PgDn, Space, Home/End, R to reset,
       1–9 to jump;
     - tap/click left or right half to go prev/next (interactive
       slide content like links is left alone);
     - a bottom-center counter overlay that fades out when idle;
     - @media print lays one slide per page for Save-as-PDF.
   ============================================================ */
(() => {
  const DESIGN_W = 1920;
  const DESIGN_H = 1080;
  const OVERLAY_HIDE_MS = 1900;
  const INTERACTIVE_SEL =
    'a[href], button, input, select, textarea, summary, label, ' +
    'video[controls], audio[controls], [role="button"], [onclick], ' +
    '[tabindex]:not([tabindex^="-"]), [contenteditable]:not([contenteditable="false" i])';

  class DeckStage extends HTMLElement {
    constructor() {
      super();
      this.index = 0;
      this.slides = [];
      this._overlayTimer = 0;
    }

    connectedCallback() {
      if (this._wired) return;
      this._wired = true;

      const w = parseInt(this.getAttribute('width') || DESIGN_W, 10);
      const h = parseInt(this.getAttribute('height') || DESIGN_H, 10);
      this.designW = w;
      this.designH = h;

      // The <section> slides authored in the page.
      this.slides = [...this.children].filter(
        (el) => el.nodeType === 1 && el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT'
      );

      this._buildShell();
      this.slides.forEach((s, i) => {
        s.classList.add('ds-slide');
        s.setAttribute('data-screen-label', `${i + 1} ${this._label(s)}`);
        this._canvas.appendChild(s);
      });

      this._fit();
      window.addEventListener('resize', this._fit.bind(this), { passive: true });
      document.addEventListener('keydown', this._onKey.bind(this));
      this._stage.addEventListener('click', this._onClick.bind(this));
      document.addEventListener('mousemove', this._showOverlay.bind(this), { passive: true });

      // Hold the first paint until fonts are ready so the deck never flashes
      // fallback typography (capped at 2s).
      this.style.visibility = 'hidden';
      const reveal = () => {
        this.go(0, 'init');
        this.style.visibility = '';
        this._showOverlay();
      };
      if (document.fonts && document.fonts.ready) {
        Promise.race([
          document.fonts.ready,
          new Promise((r) => setTimeout(r, 2000)),
        ]).then(reveal);
      } else {
        reveal();
      }
    }

    _label(el) {
      return (
        el.getAttribute('data-label') ||
        (el.querySelector('h1,h2,h3') || {}).textContent?.trim().slice(0, 40) ||
        'Slide'
      );
    }

    _buildShell() {
      const css = `
        deck-stage{position:fixed;inset:0;display:block;background:#000;overflow:hidden;
          -webkit-tap-highlight-color:transparent;}
        deck-stage .ds-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
        deck-stage .ds-canvas{position:relative;transform-origin:center center;flex-shrink:0;
          background:#fff;will-change:transform;width:${this.designW}px;height:${this.designH}px;}
        deck-stage .ds-slide{position:absolute!important;inset:0!important;width:100%!important;
          height:100%!important;box-sizing:border-box!important;overflow:hidden;
          opacity:0;visibility:hidden;pointer-events:none;}
        deck-stage .ds-slide[data-deck-active]{opacity:1;visibility:visible;pointer-events:auto;}
        deck-stage .ds-overlay{position:fixed;left:50%;bottom:22px;transform:translate(-50%,6px) scale(.92);
          display:flex;align-items:center;gap:6px;padding:6px 6px;background:#000;color:#fff;
          border-radius:999px;font:500 12px/1 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
          opacity:0;pointer-events:none;transition:opacity .26s ease,transform .26s cubic-bezier(.2,.8,.2,1);
          z-index:2147483000;user-select:none;}
        deck-stage .ds-overlay[data-visible]{opacity:1;pointer-events:auto;transform:translate(-50%,0) scale(1);}
        deck-stage .ds-btn{appearance:none;background:transparent;border:0;color:rgba(255,255,255,.72);
          height:28px;min-width:28px;border-radius:999px;cursor:pointer;display:inline-flex;
          align-items:center;justify-content:center;font:inherit;transition:background .14s,color .14s;}
        deck-stage .ds-btn:hover{background:rgba(255,255,255,.12);color:#fff;}
        deck-stage .ds-count{font-variant-numeric:tabular-nums;color:#fff;padding:0 10px;min-width:54px;
          text-align:center;font-size:12px;}
        deck-stage .ds-count .sep{color:rgba(255,255,255,.45);margin:0 4px;}
        deck-stage .ds-count .total{color:rgba(255,255,255,.55);}
        @media print{
          @page{size:${this.designW}px ${this.designH}px;margin:0;}
          html,body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
          deck-stage{position:static;background:#fff;}
          deck-stage .ds-stage{position:static;display:block;}
          deck-stage .ds-canvas{transform:none!important;}
          deck-stage .ds-slide{position:relative!important;opacity:1!important;visibility:visible!important;
            page-break-after:always;break-after:page;}
          deck-stage .ds-overlay{display:none;}
        }`;
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);

      this._stage = document.createElement('div');
      this._stage.className = 'ds-stage';
      this._canvas = document.createElement('div');
      this._canvas.className = 'ds-canvas';
      this._stage.appendChild(this._canvas);

      this._overlay = document.createElement('div');
      this._overlay.className = 'ds-overlay';
      this._overlay.innerHTML =
        '<button class="ds-btn" data-nav="prev" aria-label="Anterior">‹</button>' +
        '<span class="ds-count"><span class="cur">1</span><span class="sep">/</span><span class="total">1</span></span>' +
        '<button class="ds-btn" data-nav="next" aria-label="Siguiente">›</button>';
      this._overlay.addEventListener('click', (e) => {
        const nav = e.target.closest('[data-nav]');
        if (!nav) return;
        e.stopPropagation();
        this.go(this.index + (nav.dataset.nav === 'next' ? 1 : -1), 'click');
      });

      this.appendChild(this._stage);
      this.appendChild(this._overlay);
    }

    _fit() {
      const scale = Math.min(
        window.innerWidth / this.designW,
        window.innerHeight / this.designH
      );
      this._canvas.style.transform = `scale(${scale})`;
    }

    go(i, reason) {
      const n = this.slides.length;
      if (!n) return;
      const next = Math.max(0, Math.min(n - 1, i));
      this.slides.forEach((s, k) =>
        s.toggleAttribute('data-deck-active', k === next)
      );
      this.index = next;
      const cur = this._overlay.querySelector('.cur');
      const total = this._overlay.querySelector('.total');
      if (cur) cur.textContent = String(next + 1);
      if (total) total.textContent = String(n);
      // Notify any host listening for speaker-note sync.
      try {
        window.parent !== window &&
          window.parent.postMessage({ slideIndexChanged: next }, '*');
      } catch (_) {}
      this.dispatchEvent(
        new CustomEvent('slidechange', {
          bubbles: true,
          detail: { index: next, total: n, reason: reason || 'api' },
        })
      );
      this._showOverlay();
    }

    _onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          this.go(this.index + 1, 'keyboard');
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          this.go(this.index - 1, 'keyboard');
          break;
        case 'Home':
          e.preventDefault();
          this.go(0, 'keyboard');
          break;
        case 'End':
          e.preventDefault();
          this.go(this.slides.length - 1, 'keyboard');
          break;
        case 'r':
        case 'R':
          this.go(0, 'keyboard');
          break;
        default:
          if (/^[1-9]$/.test(e.key)) this.go(Number(e.key) - 1, 'keyboard');
      }
    }

    _onClick(e) {
      if (e.target.closest(INTERACTIVE_SEL)) return;
      const half = e.clientX < window.innerWidth / 2 ? -1 : 1;
      this.go(this.index + half, 'tap');
    }

    _showOverlay() {
      this._overlay.setAttribute('data-visible', '');
      clearTimeout(this._overlayTimer);
      this._overlayTimer = setTimeout(
        () => this._overlay.removeAttribute('data-visible'),
        OVERLAY_HIDE_MS
      );
    }
  }

  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
