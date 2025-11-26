(function () {
  'use strict';

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  class JobEditor
  {
    constructor(service) {
      this.service = service;
      this.overlay = null;
      this.canvas = null;
      this.ctx = null;
      this.image = null;
      this.state = {
        scale: 1,
        minScale: 0.5,
        maxScale: 4.0,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        dragStartX: 0,
        dragStartY: 0,
        shape: 'circle',
        radius: 24,
        bgColor: '#FFFFFF',
        width: 256,
        height: 256
      };
    }

    attach(overlay, cfg) {
      this.overlay = overlay;
      var nodes = overlay.__acNodes || {};
      this.canvas = nodes.canvas;
      this.ctx = this.canvas.getContext('2d');

      // 設定反映
      this.state.width = Number(cfg.width || 256);
      this.state.height = Number(cfg.height || 256);
      this.state.shape = String(cfg.shape || 'circle');
      this.state.radius = Number(cfg.radius || 24);
      this.state.bgColor = (cfg.bgColor === null) ? null : (cfg.bgColor || '#FFFFFF');
      this.state.minScale = Number(cfg.minScale || 0.5);
      this.state.maxScale = Number(cfg.maxScale || 4.0);
      this.state.scale = Number(cfg.initialScale || 1.0);
      this.canvas.width = this.state.width;
      this.canvas.height = this.state.height;

      // ドラッグ移動
      var self = this;
      var onDown = function (ev) {
        self.state.dragging = true;
        var pt = self._getPoint(ev);
        self.state.dragStartX = pt.x - self.state.offsetX;
        self.state.dragStartY = pt.y - self.state.offsetY;
        ev.preventDefault && ev.preventDefault();
      };
      var onMove = function (ev) {
        if (!self.state.dragging) return;
        var pt = self._getPoint(ev);
        self.state.offsetX = pt.x - self.state.dragStartX;
        self.state.offsetY = pt.y - self.state.dragStartY;
        self._clampOffset();
        self.render();
      };
      var onUp = function () { self.state.dragging = false; };

      this.canvas.addEventListener('mousedown', onDown, true);
      this.canvas.addEventListener('mousemove', onMove, true);
      this.canvas.addEventListener('mouseup', onUp, true);
      this.canvas.addEventListener('mouseleave', onUp, true);
      // タッチ
      this.canvas.addEventListener('touchstart', onDown, { passive: false });
      this.canvas.addEventListener('touchmove', onMove, { passive: false });
      this.canvas.addEventListener('touchend', onUp, true);

      overlay.__acDragHandlers = { onDown: onDown, onMove: onMove, onUp: onUp };

      this.clear();
    }

    _getPoint(ev) {
      var rect = this.canvas.getBoundingClientRect();
      var x, y;
      if (ev.touches && ev.touches.length) {
        x = ev.touches[0].clientX - rect.left;
        y = ev.touches[0].clientY - rect.top;
      } else {
        x = ev.clientX - rect.left;
        y = ev.clientY - rect.top;
      }
      return { x: x, y: y };
    }

    _clampOffset() {
      if (!this.image) return;
      var iw = this.image.width * this.state.scale;
      var ih = this.image.height * this.state.scale;
      var cw = this.state.width;
      var ch = this.state.height;
      // 画像がキャンバスより小さい場合は中央に固定
      var minX = Math.min(0, cw - iw);
      var maxX = Math.max(0, cw - iw);
      var minY = Math.min(0, ch - ih);
      var maxY = Math.max(0, ch - ih);
      this.state.offsetX = clamp(this.state.offsetX, minX, 0);
      this.state.offsetY = clamp(this.state.offsetY, minY, 0);
    }

    loadFile(file) {
      var self = this;
      return new Promise(function (resolve, reject) {
        if (!file) { reject(new Error('No file')); return; }
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            self.image = img;
            // 初期配置: 画像を全面に収める最小スケール
            var scaleX = self.state.width / img.width;
            var scaleY = self.state.height / img.height;
            var minFillScale = Math.max(scaleX, scaleY);
            self.state.scale = Math.max(minFillScale, self.state.minScale);
            // 中央寄せ
            var iw = img.width * self.state.scale;
            var ih = img.height * self.state.scale;
            self.state.offsetX = (self.state.width - iw) / 2;
            self.state.offsetY = (self.state.height - ih) / 2;
            self._clampOffset();
            self.render();
            resolve();
          };
          img.onerror = function () { reject(new Error('Image load error')); };
          img.src = reader.result;
        };
        reader.onerror = function () { reject(new Error('File read error')); };
        reader.readAsDataURL(file);
      });
    }

    setScale(scale) {
      scale = clamp(Number(scale), this.state.minScale, this.state.maxScale);
      if (scale === this.state.scale) return;
      // 中心保持スケーリング
      var cx = this.state.width / 2;
      var cy = this.state.height / 2;
      var img = this.image;
      var prevScale = this.state.scale;
      this.state.scale = scale;
      if (img) {
        var iwPrev = img.width * prevScale;
        var ihPrev = img.height * prevScale;
        var iwNext = img.width * scale;
        var ihNext = img.height * scale;
        // 中心に対するオフセット再計算
        this.state.offsetX = cx - (cx - this.state.offsetX) * (iwNext / iwPrev);
        this.state.offsetY = cy - (cy - this.state.offsetY) * (ihNext / ihPrev);
        this._clampOffset();
      }
      this.render();
    }

    clear() {
      this.ctx.clearRect(0, 0, this.state.width, this.state.height);
      // プレビューの背景（必要な場合）
      if (this.state.bgColor) {
        this.ctx.fillStyle = this.state.bgColor;
        this.ctx.fillRect(0, 0, this.state.width, this.state.height);
      } else {
        // 透明背景
      }
      this._drawMaskOutline();
    }

    _drawMaskOutline() {
      // 参考用にマスク輪郭を薄く描画（視覚的ガイド）。実際の出力は export 時にクリップ。
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      this.ctx.lineWidth = 2;
      this._applyPath(this.ctx);
      this.ctx.stroke();
      this.ctx.restore();
    }

    _applyPath(ctx) {
      var w = this.state.width, h = this.state.height;
      var shape = this.state.shape;
      var r = this.state.radius;
      ctx.beginPath();
      if (shape === 'circle') {
        var cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2;
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      } else if (shape === 'rounded') {
        var x = 0, y = 0;
        var rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        // round rect path
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
      } else { // square
        ctx.rect(0, 0, w, h);
      }
    }

    render() {
      // 背景
      this.clear();
      if (!this.image) return;
      // 画像描画（プレビューはマスク非適用でよいが、質感のためにマスク内に限定する）
      this.ctx.save();
      this._applyPath(this.ctx);
      this.ctx.clip();

      var iw = this.image.width * this.state.scale;
      var ih = this.image.height * this.state.scale;
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(this.image, 0, 0, this.image.width, this.image.height,
                         this.state.offsetX, this.state.offsetY, iw, ih);
      this.ctx.restore();

      // マスク輪郭
      this._drawMaskOutline();
    }

    exportPNG() {
      var self = this;
      return new Promise(function (resolve) {
        var off = document.createElement('canvas');
        off.width = self.state.width;
        off.height = self.state.height;
        var c = off.getContext('2d');

        if (self.state.bgColor) {
          c.fillStyle = self.state.bgColor;
          c.fillRect(0, 0, off.width, off.height);
        }

        c.save();
        self._applyPath(c);
        c.clip();

        if (self.image) {
          var iw = self.image.width * self.state.scale;
          var ih = self.image.height * self.state.scale;
          c.imageSmoothingEnabled = true;
          c.imageSmoothingQuality = 'high';
          c.drawImage(self.image, 0, 0, self.image.width, self.image.height,
                      self.state.offsetX, self.state.offsetY, iw, ih);
        }
        c.restore();

        if (off.toBlob) {
          off.toBlob(function (blob) { resolve(blob); }, 'image/png');
        } else {
          var dataURL = off.toDataURL('image/png');
          // dataURL を Blob に変換
          var byteString = atob(dataURL.split(',')[1]);
          var mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
          var ab = new ArrayBuffer(byteString.length);
          var ia = new Uint8Array(ab);
          for (var i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
          resolve(new Blob([ab], { type: mimeString }));
        }
      });
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.AvatarCreator || (Services.AvatarCreator = {});
  NS.JobEditor = NS.JobEditor || JobEditor;

})(window, document);
