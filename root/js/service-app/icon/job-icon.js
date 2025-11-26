(function () {

  'use strict';
  
  function parseSvgString(svgText)
  {
    var container = document.createElement('div');
    container.innerHTML = svgText;
    var svg = container.querySelector('svg');
    return svg || null;
  }

  class JobIcon
  {
    constructor(service)
    {
      this.service = service;
    }

    createIconElement(opts)
    {
      var iconClass = (opts && opts.iconClass) || 'c-icon';
      var useSprite = !!(opts && opts.useSprite);
      var iconId = opts && opts.iconId;
      var svgMarkup = opts && opts.svg;
      var title = (opts && opts.title) ? String(opts.title) : '';

      var svgEl = null;
      if (!useSprite && svgMarkup) {
        svgEl = parseSvgString(svgMarkup);
        if (!svgEl) {
          svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        }
      } else {
        svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        if (iconId) {
          var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          // SVG2 仕様: href 属性（xlink:href 非推奨）
          use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + String(iconId));
          use.setAttribute('href', '#' + String(iconId));
          svgEl.appendChild(use);
        }
      }

      // 共通クラス
      if (svgEl.classList) svgEl.classList.add(iconClass);
      else svgEl.setAttribute('class', iconClass);

      // タイトル（支援技術用）
      if (title) {
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        t.textContent = title;
        svgEl.insertBefore(t, svgEl.firstChild);
        svgEl.setAttribute('aria-hidden', 'true');
        // ボタン側で aria-label を持つ想定
      } else {
        svgEl.setAttribute('aria-hidden', 'true');
        svgEl.setAttribute('focusable', 'false');
      }

      return svgEl;
    }

    replaceIcon(targetButton, newIcon) {
      if (!targetButton || !newIcon) return false;
      var iconClass = this.service.config.iconClass || 'c-icon';
      var old = targetButton.querySelector('.' + iconClass);
      if (old && old.parentNode) old.parentNode.replaceChild(newIcon, old);
      else targetButton.insertBefore(newIcon, targetButton.firstChild);
      return true;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Icon || (Services.Icon = {});
  NS.JobIcon = NS.JobIcon || JobIcon;    

})(window, document);
