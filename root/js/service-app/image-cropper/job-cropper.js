(function () {

  'use strict';

  // 画像選択ロジックとイベント処理を担当
  class JobCropper
  {
    constructor(service)
    {
      this.service = service;
    }

    mount(root, session)
    {
      if (!root || !root.__ic) return;
      var s = root.__ic;
      var cfg = s.cfg;

      // 初期選択
      var init = this._computeInitialSelection(root, cfg);
      this.setSelection(root, init);

      // ボタンイベント
      var onOk = (ev) => {
        ev && ev.preventDefault && ev.preventDefault();
        if (s.callbacks && typeof s.callbacks.onConfirm === 'function') {
          try { s.callbacks.onConfirm(session); } catch (e) {}
        }
      };
      var onCancel = (ev) => {
        ev && ev.preventDefault && ev.preventDefault();
        if (s.callbacks && typeof s.callbacks.onCancel === 'function') {
          try { s.callbacks.onCancel(session); } catch (e) {}
        }
      };
      s.actions.ok.addEventListener('click', onOk, true);
      s.actions.cancel.addEventListener('click', onCancel, true);
      s.listeners.push({ target: s.actions.ok, type: 'click', fn: onOk, opts: true });
      s.listeners.push({ target: s.actions.cancel, type: 'click', fn: onCancel, opts: true });

      // ドラッグ処理（box移動）
      var dragState = null;
      var onBoxDown = (ev) => {
        var p = this._pt(ev, root);
        if (!p) return;
        var r = s.rect;
        dragState = { mode: 'move', start: p, base: { x: r.x, y: r.y, w: r.width, h: r.height } };
        this._capture(ev);
      };
      var onMove = (ev) => {
        if (!dragState) return;
        var p = this._pt(ev, root);
        if (!p) return;
        if (dragState.mode === 'move') {
          var dx = p.x - dragState.start.x;
          var dy = p.y - dragState.start.y;
          var nx = dragState.base.x + dx;
          var ny = dragState.base.y + dy;
          var rect = { x: nx, y: ny, width: dragState.base.w, height: dragState.base.h };
          rect = this._clampRect(rect, root, cfg);
          this.service.jobs.ui.applySelection(root, rect);
        } else if (dragState.mode === 'resize') {
          var rect2 = this._resizeFrom(dragState, p, root, cfg);
          rect2 = this._clampRect(rect2, root, cfg);
          rect2 = this._applyAspect(rect2, dragState.anchor, root, cfg);
          this.service.jobs.ui.applySelection(root, rect2);
        }
      };
      var onUp = (ev) => {
        if (!dragState) return;
        dragState = null;
        this._release(ev);
      };
      s.box.addEventListener('mousedown', onBoxDown, true);
      s.listeners.push({ target: s.box, type: 'mousedown', fn: onBoxDown, opts: true });
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
      s.listeners.push({ target: d, type: 'mousemove', fn: onMove, opts: true });
      s.listeners.push({ target: d, type: 'mouseup', fn: onUp, opts: true });

      // ハンドルのリサイズ
      var onHandleDown = (ev) => {
        var dir = ev.currentTarget.getAttribute('data-dir') || '';
        var p = this._pt(ev, root);
        if (!p) return;
        var r = s.rect;
        dragState = { mode: 'resize', start: p, base: { x: r.x, y: r.y, w: r.width, h: r.height }, dir: dir, anchor: this._anchorFor(dir, r) };
        this._capture(ev);
      };
      for (var dir in s.handles) {
        if (!Object.prototype.hasOwnProperty.call(s.handles, dir)) continue;
        var h = s.handles[dir];
        h.addEventListener('mousedown', onHandleDown, true);
        s.listeners.push({ target: h, type: 'mousedown', fn: onHandleDown, opts: true });
      }

      // ルート上の新規ドラッグ（選択作成）
      var onRootDown = (ev) => {
        if (ev.target === s.box || ev.target.classList.contains('c-ic__handle') || ev.target.closest('.c-ic__actions')) return;
        var p = this._pt(ev, root);
        if (!p) return;
        var rect = { x: p.x, y: p.y, width: 0, height: 0 };
        this.setSelection(root, rect);
        dragState = { mode: 'resize', start: p, base: { x: p.x, y: p.y, w: 0, h: 0 }, dir: 'se', anchor: { x: p.x, y: p.y } };
        this._capture(ev);
      };
      root.addEventListener('mousedown', onRootDown, true);
      s.listeners.push({ target: root, type: 'mousedown', fn: onRootDown, opts: true });

      // キーボード微調整
      if (cfg.keyboard) {
        var onKey = (ev) => {
          var step = ev.shiftKey ? 10 : 1;
          var r = Object.assign({}, s.rect);
          var changed = false;
          if (ev.key === 'ArrowLeft')  { r.x -= step; changed = true; }
          if (ev.key === 'ArrowRight') { r.x += step; changed = true; }
          if (ev.key === 'ArrowUp')    { r.y -= step; changed = true; }
          if (ev.key === 'ArrowDown')  { r.y += step; changed = true; }
          if (ev.key === 'Enter') {
            if (s.callbacks && typeof s.callbacks.onConfirm === 'function') {
              try { s.callbacks.onConfirm(session); } catch (e) {}
            }
          }
          if (ev.key === 'Escape') {
            if (s.callbacks && typeof s.callbacks.onCancel === 'function') {
              try { s.callbacks.onCancel(session); } catch (e) {}
            }
          }
          if (changed) {
            ev.preventDefault();
            r = this._clampRect(r, root, cfg);
            this.service.jobs.ui.applySelection(root, r);
          }
        };
        document.addEventListener('keydown', onKey, true);
        s.listeners.push({ target: d, type: 'keydown', fn: onKey, opts: true });
      }
    }

    unmount(root) {
      if (!root || !root.__ic) return;
      var s = root.__ic;
      // イベント解除
      if (s.listeners && s.listeners.length) {
        for (var i = 0; i < s.listeners.length; i++) {
          var it = s.listeners[i];
          try { it.target.removeEventListener(it.type, it.fn, it.opts); } catch (e) {}
        }
      }
    }

    getSelection(root) {
      if (!root || !root.__ic) return null;
      return Object.assign({}, root.__ic.rect);
    }

    setSelection(root, rect) {
      if (!root || !root.__ic) return;
      var cfg = root.__ic.cfg;
      var r = Object.assign({ x: 0, y: 0, width: 0, height: 0 }, rect || {});
      r = this._clampRect(r, root, cfg);
      r = this._applyAspect(r, /*anchor*/ null, root, cfg);
      this.service.jobs.ui.applySelection(root, r);
    }

    extractCanvas(root, options) {
      if (!root || !root.__ic) return null;
      var s = root.__ic;
      var img = s.img;
      var rect = s.rect || {x:0,y:0,width:0,height:0};
      var sx = Math.max(0, Math.round(rect.x * s.scaleX));
      var sy = Math.max(0, Math.round(rect.y * s.scaleY));
      var sw = Math.max(1, Math.round(rect.width * s.scaleX));
      var sh = Math.max(1, Math.round(rect.height * s.scaleY));
      var canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      var ctx = canvas.getContext('2d');
      try {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      } catch (e) {}
      return canvas;
    }

    // --- 内部ユーティリティ ---

    _pt(ev, root) {
      var x, y;
      if (ev.touches && ev.touches.length) {
        x = ev.touches[0].clientX; y = ev.touches[0].clientY;
      } else {
        x = ev.clientX; y = ev.clientY;
      }
      var r = root.getBoundingClientRect();
      return { x: x - r.left, y: y - r.top };
    }

    _capture(ev) {
      if (!ev) return;
      ev.preventDefault && ev.preventDefault();
      ev.stopPropagation && ev.stopPropagation();
    }

    _release(ev) {
      if (!ev) return;
      // no-op (フラグ解除のみで十分)
    }

    _clampRect(r, root, cfg) {
      var minW = Math.max(0, Number(cfg.minWidth || 0));
      var minH = Math.max(0, Number(cfg.minHeight || 0));
      var W = root.clientWidth, H = root.clientHeight;

      var x = Math.max(0, Math.min(r.x, W));
      var y = Math.max(0, Math.min(r.y, H));
      var w2 = Math.max(minW, Math.min(r.width, W));
      var h2 = Math.max(minH, Math.min(r.height, H));

      // はみ出し補正
      if (x + w2 > W) x = Math.max(0, W - w2);
      if (y + h2 > H) y = Math.max(0, H - h2);

      return { x: x, y: y, width: w2, height: h2 };
    }

    _applyAspect(r, anchor, root, cfg) {
      var ratio = this._parseAspect(cfg && cfg.aspectRatio);
      if (!ratio) return r;
      var W = root.clientWidth, H = root.clientHeight;
      var x = r.x, y = r.y, w2 = r.width, h2 = r.height;

      if (w2 <= 0 || h2 <= 0) return r;
      var current = w2 / h2;
      if (Math.abs(current - ratio) < 1e-3) return r;

      if (!anchor) {
        // 中心基準で修正
        var cx = x + w2 / 2;
        var cy = y + h2 / 2;
        if (current > ratio) {
          // 横長すぎ → 幅を縮める
          w2 = h2 * ratio;
        } else {
          // 縦長すぎ → 高さを縮める
          h2 = w2 / ratio;
        }
        x = cx - w2 / 2;
        y = cy - h2 / 2;
      } else {
        // アンカー基準（リサイズ時）
        if (current > ratio) {
          // 横長すぎ → 幅を縮める
          w2 = h2 * ratio;
          if (x < anchor.x) x = anchor.x - w2;
        } else {
          // 縦長すぎ → 高さを縮める
          h2 = w2 / ratio;
          if (y < anchor.y) y = anchor.y - h2;
        }
      }

      // 境界と最小サイズを再適用
      var rr = this._clampRect({ x: x, y: y, width: w2, height: h2 }, root, cfg);
      return rr;
    }

    _parseAspect(v) {
      if (v == null || v === '' || v === false) return null;
      if (typeof v === 'number') return v > 0 ? v : null;
      if (typeof v === 'string') {
        var s = v.split(':');
        if (s.length === 2) {
          var a = parseFloat(s[0]), b = parseFloat(s[1]);
          if (a > 0 && b > 0) return a / b;
        }
        var n = parseFloat(v);
        if (n > 0) return n;
      }
      return null;
    }

    _resizeFrom(state, p, root, cfg) {
      var b = state.base;
      var dir = state.dir || 'se';
      var r = { x: b.x, y: b.y, width: b.w, height: b.h };

      // dir に応じて r を更新
      var dx = p.x - state.start.x;
      var dy = p.y - state.start.y;

      if (dir.indexOf('e') >= 0) {
        r.width = Math.max(0, b.w + dx);
      }
      if (dir.indexOf('s') >= 0) {
        r.height = Math.max(0, b.h + dy);
      }
      if (dir.indexOf('w') >= 0) {
        r.x = b.x + dx;
        r.width = Math.max(0, b.w - dx);
      }
      if (dir.indexOf('n') >= 0) {
        r.y = b.y + dy;
        r.height = Math.max(0, b.h - dy);
      }

      return r;
    }

    _anchorFor(dir, baseRect) {
      var x = baseRect.x, y = baseRect.y, w2 = baseRect.width, h2 = baseRect.height;
      var anchor = { x: x, y: y };
      switch (dir) {
        case 'n':  anchor = { x: x + w2 / 2, y: y + h2 }; break;
        case 'ne': anchor = { x: x, y: y + h2 }; break;
        case 'e':  anchor = { x: x, y: y + h2 / 2 }; break;
        case 'se': anchor = { x: x, y: y }; break;
        case 's':  anchor = { x: x + w2 / 2, y: y }; break;
        case 'sw': anchor = { x: x + w2, y: y }; break;
        case 'w':  anchor = { x: x + w2, y: y + h2 / 2 }; break;
        case 'nw': anchor = { x: x + w2, y: y + h2 }; break;
      }
      return anchor;
    }

    _computeInitialSelection(root, cfg) {
      var W = root.clientWidth, H = root.clientHeight;
      var init = cfg.initialSelection;
      var r;
      if (init && typeof init === 'object') {
        r = { x: +init.x || 0, y: +init.y || 0, width: +init.width || 0, height: +init.height || 0 };
      } else {
        // デフォルト: 短辺の70%の正方形（アスペクト未指定時）。アスペクト指定ありなら 80% cover。
        var ratio = this._parseAspect(cfg && cfg.aspectRatio);
        if (!ratio) {
          var s = Math.floor(Math.min(W, H) * 0.7);
          r = { x: Math.floor((W - s) / 2), y: Math.floor((H - s) / 2), width: s, height: s };
        } else {
          // cover 80%
          var w2 = Math.floor(W * 0.8), h2 = Math.floor(w2 / ratio);
          if (h2 > H) { h2 = Math.floor(H * 0.8); w2 = Math.floor(h2 * ratio); }
          r = { x: Math.floor((W - w2) / 2), y: Math.floor((H - h2) / 2), width: w2, height: h2 };
        }
      }
      r = this._clampRect(r, root, cfg);
      r = this._applyAspect(r, /*anchor*/ null, root, cfg);
      return r;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.ImageCropper || (Services.ImageCropper = {});
  NS.JobCropper = NS.JobCropper || JobCropper;    

})(window, document);
