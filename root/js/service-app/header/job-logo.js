(function (w)
 {
   'use strict';
   
   class HeaderJobLogo
   {
     constructor(serviceInstance)
     {
       this.serviceInstance = serviceInstance;
     }
     
     loadP5IfNeeded(firstSrc)
     {
       return new Promise(function (resolve, reject) {
         if (w.p5) { resolve(w.p5); return; }

         var candidates = [
           // 1) 設定で渡されたもの（存在すれば）
           firstSrc || '',
           // 2) 公式 CDN 候補
           'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js',
           'https://unpkg.com/p5@1.9.0/lib/p5.min.js'
         ].filter(Boolean);

         (function tryNext(i) {
           if (i >= candidates.length) {
             reject(new Error('failed to load p5: ' + (firstSrc || '(no src)')));
             return;
           }
           var src = candidates[i];
           var el = document.createElement('script');
           el.src = src;
           el.async = false;
           el.onload = function () { w.p5 ? resolve(w.p5) : tryNext(i + 1); };
           el.onerror = function () { tryNext(i + 1); };
           document.head.appendChild(el);
         })(0);
       });
     }

     /**
      * p5.js を利用してヘッダーロゴをキャンバス描画する。
      * 副作用: p5.js の読み込み（未読込時）と、対象要素配下の DOM（canvas）の生成を行う。
      *
      * @param {JQuery<HTMLElement>} $anchor ロゴ描画先のアンカー要素。
      * @param {Object} options 描画オプション。src/label/fontSize を想定。
      * @returns {Promise<void>} 描画完了または失敗で resolve/reject される Promise。
      */
    drawLogoWithP5($anchor, options)
    {
      const label = options && options.label ? String(options.label) : 'ADVANCED';
      const size = options && Number(options.size) > 0 ? Number(options.size) : 88;
      const ringRepeat = options && Number(options.ringRepeat) > 0 ? Math.floor(Number(options.ringRepeat)) : 1;
      const $elements = $anchor && typeof $anchor.toArray === 'function' ? $anchor.toArray() : [];
      if ($elements.length === 0) { return; }

      return this.loadP5IfNeeded(options && options.src).then(() => {
        for (let i = 0; i < $elements.length; i++) {
          const element = $elements[i];
          if (!element) { continue; }
          this._renderAnimatedLogo(element, { label: label, size: size, ringRepeat: ringRepeat });
        }
      }).catch(function (err) {
        console.error('[header] p5 logo draw failed:', err);
      });
    }

    _renderAnimatedLogo(target, config)
    {
      if (!target) { return; }
      const host = document.createElement('span');
      host.className = 'site-header__logo-canvas';
      host.setAttribute('aria-hidden', 'true');

      while (target.firstChild) {
        target.removeChild(target.firstChild);
      }

      target.appendChild(host);

      const hiddenLabel = document.createElement('span');
      hiddenLabel.className = 'visually-hidden';
      hiddenLabel.textContent = config.label;
      target.appendChild(hiddenLabel);
      target.setAttribute('aria-label', config.label);

      const sketch = this._createLogoSketch(host, config);
      new window.p5(sketch); // eslint-disable-line no-new
    }

    _createLogoSketch(host, config)
    {
      const size = config && Number(config.size) > 0 ? Number(config.size) : 88;
      const text = config && config.label ? String(config.label) : 'ADVANCED';
      const repeat = config && Number(config.ringRepeat) > 0 ? Math.floor(Number(config.ringRepeat)) : 1;
      const letters = this._buildLetterRing(text, repeat);
      const textRadius = size * 0.38;

      function projectPoint(x, y, z, perspective)
      {
        const scale = perspective / (perspective - z);
        return {
          x: x * scale,
          y: y * scale,
          scale: scale
        };
      }

      return function (p) {
        p.setup = function () {
          const canvas = p.createCanvas(size, size);
          canvas.parent(host);
          p.pixelDensity(2);
          p.frameRate(60);
        };

        p.draw = function () {
          p.clear(0, 0, 0, 0);

          const ctx = p.drawingContext;
          const time = p.millis() * 0.0006;

          p.push();
          p.translate(size / 2, size / 2);
          p.strokeCap(p.ROUND);
          p.noFill();

          const orbitColors = [
            [64, 184, 255, 210],
            [60, 139, 255, 190],
            [45, 212, 191, 180]
          ];

          for (let i = 0; i < orbitColors.length; i++) {
            const dir = i % 2 === 0 ? 1 : -1;
            const radius = size * (0.58 + i * 0.08);
            p.push();
            p.rotate(time * (0.35 + i * 0.18) * dir);
            const col = orbitColors[i];
            p.stroke(col[0], col[1], col[2], col[3]);
            p.strokeWeight(3 - i * 0.4);
            const arcStart = -p.QUARTER_PI * (1.5 - i * 0.2);
            const arcEnd = arcStart + p.PI * (0.8 + i * 0.25);
            p.arc(0, 0, radius, radius, arcStart, arcEnd);
            p.pop();
          }

          ctx.save();
          ctx.shadowBlur = 24;
          ctx.shadowColor = 'rgba(80, 180, 255, 0.6)';
          p.noFill();
          p.stroke(56, 189, 248, 150);
          p.strokeWeight(2.5);
          p.ellipse(0, 0, size * 0.88, size * 0.88);
          ctx.restore();

          const sphereRadius = size * 0.36;
          for (let r = sphereRadius; r > 0; r -= 1.2) {
            const t = r / sphereRadius;
            const col = p.lerpColor(p.color(25, 45, 102, 200), p.color(13, 148, 136, 240), t);
            p.fill(col);
            p.noStroke();
            p.circle(0, 0, r * 2);
          }

          const glowRadius = size * 0.16;
          ctx.save();
          ctx.shadowBlur = 18;
          ctx.shadowColor = 'rgba(148, 210, 255, 0.75)';
          p.fill(28, 100, 242, 140);
          p.circle(0, 0, glowRadius * 1.6);
          ctx.restore();

          const perspective = size * 1.1;
          const baseAngle = time * 0.55;
          const step = -((Math.PI * 2) / letters.length);

          p.textAlign(p.CENTER, p.CENTER);
          p.textStyle(p.BOLD);

          const glyphs = [];
          for (let j = 0; j < letters.length; j++) {
            const letterAngle = baseAngle + j * step;
            const x = Math.cos(letterAngle) * textRadius;
            const z = Math.sin(letterAngle) * textRadius;
            const y = Math.sin(letterAngle * 2 + time * 0.6) * (size * 0.12);
            const projected = projectPoint(x, y, z, perspective);
            let alpha = p.map(z, -size * 0.38, size * 0.38, 70, 255);
            alpha = Math.max(50, Math.min(255, alpha));

            glyphs.push({
              char: letters[j],
              x: projected.x,
              y: projected.y,
              z: z,
              alpha: alpha,
              scale: projected.scale
            });
          }

          glyphs
            .sort(function (a, b) {
              return a.z - b.z;
            })
            .forEach(function (glyph) {
              if (glyph.z < 0 || !glyph.char) {
                return;
              }

              const letterColor = p.color(191, 219, 254, glyph.alpha);
              p.fill(letterColor);
              p.textSize(Math.max(size * 0.12, size * 0.18 * glyph.scale));
              p.text(glyph.char, glyph.x, glyph.y);
            });

          p.pop();
        };
      };
    }

    _buildLetterRing(text, repeat)
    {
      const raw = String(text || '').toUpperCase();
      const source = raw.length > 0 ? raw : 'ADVANCED';
      const letters = [];
      const count = repeat > 0 ? repeat : 1;
      for (let r = 0; r < count; r++) {
        for (let i = 0; i < source.length; i++) {
          letters.push(source[i]);
          letters.push('');
        }
        if (r < count - 1) {
          letters.push('•');
          letters.push('');
        }
      }
      return letters;
    }
     
   }
   
  // Services.header 名前空間の直下に公開（再定義ガード付き）
  var Services = window.Services = window.Services || {};
  var NS = Services.header || (Services.header = {});
  NS.JobLogo = NS.JobLogo || HeaderJobLogo;

})(window);
