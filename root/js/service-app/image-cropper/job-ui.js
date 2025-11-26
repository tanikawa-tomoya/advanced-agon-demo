(function () {
  'use strict';

  // UI構築と描画更新を担当
  class JobUI
  {
    constructor(service)
    {
      this.service = service;
    }

    createOverlay(img, cfg, cbs)
    {
      if (!img) return null;
      var rect = img.getBoundingClientRect();
      var root = document.createElement('div');
      root.className = 'c-ic';
      root.setAttribute('tabindex', '-1');
      root.style.position = 'fixed';
      root.style.left = rect.left + 'px';
      root.style.top = rect.top + 'px';
      root.style.width = rect.width + 'px';
      root.style.height = rect.height + 'px';
      root.style.zIndex = String(cfg.zIndex || 10000);
      root.style.pointerEvents = 'none'; // 子要素にイベントを通す
      root.style.userSelect = 'none';

      // 内部ストレージ
      var store = {
        img: img,
        cfg: cfg,
        callbacks: cbs || {},
        rect: { x: 0, y: 0, width: 0, height: 0 },
        scaleX: 1, // natural/display
        scaleY: 1,
        listeners: [],
        // UI refs
        shades: null,
        box: null,
        handles: {},
        actions: null
      };
      root.__ic = store;

      // スケール計算
      try {
        var naturalW = img.naturalWidth || rect.width;
        var naturalH = img.naturalHeight || rect.height;
        store.scaleX = naturalW / rect.width;
        store.scaleY = naturalH / rect.height;
      } catch (e) {}

      // シェード（4分割）
      var shades = {
        top: document.createElement('div'),
        right: document.createElement('div'),
        bottom: document.createElement('div'),
        left: document.createElement('div')
      };
      for (var k in shades) {
        if (!Object.prototype.hasOwnProperty.call(shades, k)) continue;
        var el = shades[k];
        el.className = 'c-ic__shade is-' + k;
        el.style.position = 'absolute';
        el.style.background = 'rgba(0,0,0,' + (cfg.overlayOpacity != null ? cfg.overlayOpacity : 0.5) + ')';
        el.style.pointerEvents = 'none';
        root.appendChild(el);
      }
      store.shades = shades;

      // 選択ボックス
      var box = document.createElement('div');
      box.className = 'c-ic__box';
      box.style.position = 'absolute';
      box.style.outline = '1px solid #fff';
      box.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.6)';
      box.style.pointerEvents = 'auto';
      root.appendChild(box);
      store.box = box;

      // ガイド線
      if (cfg.guides) {
        var guides = document.createElement('div');
        guides.className = 'c-ic__guides';
        guides.style.position = 'absolute';
        guides.style.left = '0';
        guides.style.top = '0';
        guides.style.right = '0';
        guides.style.bottom = '0';
        guides.style.pointerEvents = 'none';
        // 2本の縦線 + 2本の横線（3分割）
        for (var i = 0; i < 4; i++) {
          var g = document.createElement('div');
          g.className = 'c-ic__guide';
          g.style.position = 'absolute';
          g.style.background = 'rgba(255,255,255,0.6)';
          if (i < 2) { // vertical
            g.style.width = '1px';
            g.style.top = '0';
            g.style.bottom = '0';
            g.style.left = ((i + 1) * (100 / 3)) + '%';
          } else { // horizontal
            g.style.height = '1px';
            g.style.left = '0';
            g.style.right = '0';
            g.style.top = ((i - 1) * (100 / 3)) + '%';
          }
          guides.appendChild(g);
        }
        box.appendChild(guides);
      }

      // ハンドル
      if (cfg.handles) {
        var dirs = ['n','ne','e','se','s','sw','w','nw'];
        for (var j = 0; j < dirs.length; j++) {
          var dir = dirs[j];
          var h = document.createElement('div');
          h.className = 'c-ic__handle is-' + dir;
          h.setAttribute('data-dir', dir);
          h.style.position = 'absolute';
          h.style.width = '10px';
          h.style.height = '10px';
          h.style.background = '#fff';
          h.style.border = '1px solid #000';
          h.style.boxSizing = 'border-box';
          h.style.transform = 'translate(-50%,-50%)';
          switch (dir) {
            case 'n':  h.style.left = '50%'; h.style.top = '0%'; break;
            case 'ne': h.style.left = '100%'; h.style.top = '0%'; break;
            case 'e':  h.style.left = '100%'; h.style.top = '50%'; break;
            case 'se': h.style.left = '100%'; h.style.top = '100%'; break;
            case 's':  h.style.left = '50%'; h.style.top = '100%'; break;
            case 'sw': h.style.left = '0%';   h.style.top = '100%'; break;
            case 'w':  h.style.left = '0%';   h.style.top = '50%'; break;
            case 'nw': h.style.left = '0%';   h.style.top = '0%'; break;
          }
          box.appendChild(h);
          store.handles[dir] = h;
        }
      }

      // アクション（確定/取消）
      var actions = document.createElement('div');
      actions.className = 'c-ic__actions';
      actions.style.position = 'absolute';
      actions.style.left = '50%';
      actions.style.bottom = '8px';
      actions.style.transform = 'translateX(-50%)';
      actions.style.pointerEvents = 'auto';
      var btnOk = document.createElement('button');
      btnOk.type = 'button';
      btnOk.className = 'c-ic__btn is-ok';
      btnOk.textContent = String((cfg && cfg.confirmText) || 'Crop');
      var btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'c-ic__btn is-cancel';
      btnCancel.textContent = String((cfg && cfg.cancelText) || 'Cancel');
      actions.appendChild(btnOk);
      actions.appendChild(btnCancel);
      root.appendChild(actions);
      store.actions = { root: actions, ok: btnOk, cancel: btnCancel };

      // ルートをDOMに追加
      document.body.appendChild(root);

      // ウィンドウスクロール/リサイズ時に位置補正
      var onRelayout = () => {
        var r2 = img.getBoundingClientRect();
        root.style.left = r2.left + 'px';
        root.style.top = r2.top + 'px';
        root.style.width = r2.width + 'px';
        root.style.height = r2.height + 'px';
        // スケール再計算
        try {
          var nw = img.naturalWidth || r2.width;
          var nh = img.naturalHeight || r2.height;
          store.scaleX = nw / r2.width;
          store.scaleY = nh / r2.height;
        } catch (e) {}
        // 既存のrectをUIへ反映
        if (store.rect && store.rect.width > 0 && store.rect.height > 0) {
          this.applySelection(root, store.rect);
        }
      };
      w.addEventListener('scroll', onRelayout, true);
      w.addEventListener('resize', onRelayout, true);
      store.listeners.push({ target: w, type: 'scroll', fn: onRelayout, opts: true });
      store.listeners.push({ target: w, type: 'resize', fn: onRelayout, opts: true });

      return root;
    }

    // 選択矩形を UI に反映（表示座標系）
    applySelection(root, rect) {
      if (!root || !root.__ic) return;
      var s = root.__ic;
      s.rect = {
        x: Math.max(0, Math.min(rect.x, root.clientWidth)),
        y: Math.max(0, Math.min(rect.y, root.clientHeight)),
        width: Math.max(0, Math.min(rect.width, root.clientWidth)),
        height: Math.max(0, Math.min(rect.height, root.clientHeight))
      };
      // ボックスのスタイル更新
      var x = s.rect.x, y = s.rect.y, w2 = s.rect.width, h2 = s.rect.height;
      s.box.style.left = x + 'px';
      s.box.style.top = y + 'px';
      s.box.style.width = w2 + 'px';
      s.box.style.height = h2 + 'px';

      // シェード更新（4分割で選択以外を覆う）
      var W = root.clientWidth, H = root.clientHeight;
      var shades = s.shades;
      // top
      shades.top.style.left = '0px';
      shades.top.style.top = '0px';
      shades.top.style.width = W + 'px';
      shades.top.style.height = Math.max(0, y) + 'px';
      // bottom
      shades.bottom.style.left = '0px';
      shades.bottom.style.top = (y + h2) + 'px';
      shades.bottom.style.width = W + 'px';
      shades.bottom.style.height = Math.max(0, H - (y + h2)) + 'px';
      // left
      shades.left.style.left = '0px';
      shades.left.style.top = y + 'px';
      shades.left.style.width = Math.max(0, x) + 'px';
      shades.left.style.height = Math.max(0, h2) + 'px';
      // right
      shades.right.style.left = (x + w2) + 'px';
      shades.right.style.top = y + 'px';
      shades.right.style.width = Math.max(0, W - (x + w2)) + 'px';
      shades.right.style.height = Math.max(0, h2) + 'px';

      // 変更通知
      if (s.callbacks && typeof s.callbacks.onChange === 'function') {
        try { s.callbacks.onChange(root.__ic.session, s.rect); } catch (e) {}
      }
    }

    removeOverlay(root) {
      if (!root || !root.__ic) return;
      var s = root.__ic;
      // イベント解除
      if (s.listeners && s.listeners.length) {
        for (var i = 0; i < s.listeners.length; i++) {
          var it = s.listeners[i];
          try { it.target.removeEventListener(it.type, it.fn, it.opts); } catch (e) {}
        }
      }
      if (root.parentNode) root.parentNode.removeChild(root);
      root.__ic = null;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.ImageCropper || (Services.ImageCropper = {});
  NS.JobUI = NS.JobUI || JobUI;      

})(window, document);
