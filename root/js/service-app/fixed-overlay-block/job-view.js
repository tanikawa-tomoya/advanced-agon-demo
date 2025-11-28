(function () {
  'use strict';

  class JobView
  {
    constructor(service)
    {
      this.service = service;
    }

    resolveContainer(ref)
    {
      if (!ref) {
        console.log('[FixedOverlayBlock] resolveContainer: no ref provided, use body');
        return document.body;
      }
      if (typeof ref === 'string') {
        var el = document.querySelector(ref);
        if (!el) {
          console.log('[FixedOverlayBlock] resolveContainer: selector not found, use body', ref);
        }
        return el || document.body;
      }
      if (ref && ref.nodeType === 1) { return ref; }
      console.log('[FixedOverlayBlock] resolveContainer: unrecognized ref, use body', ref);
      return document.body;
    }

    createBlock(options)
    {
      var block = document.createElement('div');
      block.className = 'c-fixed-overlay-block';
      block.classList.add(options.position === 'left' ? 'is-left' : 'is-right');
      block.style.bottom = this._toCssLength(options.offsetBottom);
      if (options.position === 'left') {
        block.style.left = this._toCssLength(options.offsetLeft);
        block.style.right = 'auto';
      } else {
        block.style.right = this._toCssLength(options.offsetRight);
        block.style.left = 'auto';
      }
      block.style.borderWidth = this._toCssLength(options.borderWidth);
      block.style.borderColor = options.borderColor;
      block.style.borderStyle = 'solid';
      block.style.backgroundColor = options.backgroundColor;
      block.style.width = this._toCssLength(options.width);
      block.style.minHeight = this._toCssLength(options.minHeight);
      block.style.zIndex = String(options.zIndex);

      var background = document.createElement('div');
      background.className = 'c-fixed-overlay-block__background';
      if (options.backgroundImage) {
        background.style.backgroundImage = 'url(' + options.backgroundImage + ')';
      }
      background.style.backgroundSize = this._resolveBackgroundSize(options.imageSize);
      background.style.opacity = this._toOpacity(options.imageOpacity);

      var content = document.createElement('div');
      content.className = 'c-fixed-overlay-block__content';

      var header = document.createElement('div');
      header.className = 'c-fixed-overlay-block__header';
      header.innerHTML = options.headerHtml || '';

      var title = document.createElement('div');
      title.className = 'c-fixed-overlay-block__title';
      title.innerHTML = options.titleHtml || '';

      var footer = document.createElement('div');
      footer.className = 'c-fixed-overlay-block__footer';
      footer.innerHTML = options.footerHtml || '';

      content.appendChild(header);
      content.appendChild(title);
      content.appendChild(footer);

      block.appendChild(background);
      block.appendChild(content);

      return block;
    }

    updateBlock(node, options)
    {
      if (!node || node.className.indexOf('c-fixed-overlay-block') === -1) { return null; }
      var parent = node.parentNode;
      if (parent) {
        var nextBlock = this.createBlock(options);
        parent.replaceChild(nextBlock, node);
        return nextBlock;
      }
      return null;
    }

    removeBlock(node)
    {
      if (!node || !node.parentNode) return false;
      node.parentNode.removeChild(node);
      return true;
    }

    _toCssLength(value)
    {
      if (typeof value === 'number' && isFinite(value)) { return value + 'px'; }
      if (typeof value === 'string' && value.trim().length > 0) { return value.trim(); }
      return '0px';
    }

    _toOpacity(value)
    {
      if (typeof value !== 'number' || !isFinite(value)) { return '1'; }
      var normalized = Math.min(Math.max(value, 0), 1);
      return String(normalized);
    }

    _resolveBackgroundSize(value)
    {
      if (typeof value === 'string' && value.trim().length > 0) { return value.trim(); }
      return 'cover';
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.FixedOverlayBlock || (Services.FixedOverlayBlock = {});
  NS.JobView = NS.JobView || JobView;

})(window, document);
