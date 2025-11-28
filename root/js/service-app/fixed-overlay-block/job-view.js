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
      if (!ref) return document.body;
      if (typeof ref === 'string') {
        var el = document.querySelector(ref);
        return el || document.body;
      }
      if (ref && ref.nodeType === 1) { return ref; }
      return document.body;
    }

    createBlock(options)
    {
      var wrapper = document.createElement('div');
      wrapper.className = 'c-fixed-overlay-block-wrapper';
      wrapper.classList.add(options.position === 'left' ? 'is-left' : 'is-right');
      wrapper.style.bottom = this._toCssLength(options.offsetBottom);
      if (options.position === 'left') {
        wrapper.style.left = this._toCssLength(options.offsetLeft);
        wrapper.style.right = 'auto';
      } else {
        wrapper.style.right = this._toCssLength(options.offsetRight);
        wrapper.style.left = 'auto';
      }
      wrapper.style.setProperty('--fixed-overlay-block-base-width', this._toCssLength(options.width));
      wrapper.style.setProperty('--fixed-overlay-block-min-height', this._toCssLength(options.minHeight));
      wrapper.style.zIndex = String(options.zIndex);

      if (options.outerLabelHtml) {
        var label = document.createElement('div');
        label.className = 'c-fixed-overlay-block__outer-label';
        label.innerHTML = options.outerLabelHtml;
        wrapper.appendChild(label);
      }

      var block = document.createElement('div');
      block.className = 'c-fixed-overlay-block';
      block.style.setProperty('--fixed-overlay-block-border-width', this._toCssLength(options.borderWidth));
      block.style.setProperty('--fixed-overlay-block-border-color', options.borderColor);
      block.style.setProperty('--fixed-overlay-block-surface', options.backgroundColor);

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
      wrapper.appendChild(block);

      return wrapper;
    }

    updateBlock(node, options)
    {
      if (!node) { return null; }
      var target = node;
      if (node.className.indexOf('c-fixed-overlay-block-wrapper') === -1 && node.parentNode && node.parentNode.className.indexOf('c-fixed-overlay-block-wrapper') !== -1) {
        target = node.parentNode;
      }

      if (target.className.indexOf('c-fixed-overlay-block-wrapper') === -1) { return null; }
      var parent = target.parentNode;
      if (parent) {
        var nextBlock = this.createBlock(options);
        parent.replaceChild(nextBlock, target);
        return nextBlock;
      }
      return null;
    }

    removeBlock(node)
    {
      if (!node) { return false; }
      var target = node;
      if (node.className.indexOf('c-fixed-overlay-block-wrapper') === -1 && node.parentNode && node.parentNode.className.indexOf('c-fixed-overlay-block-wrapper') !== -1) {
        target = node.parentNode;
      }
      if (!target.parentNode) { return false; }
      target.parentNode.removeChild(target);
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
