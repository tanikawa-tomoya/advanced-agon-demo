(function () {

  'use strict';

  var SHAPE_CLASSES = ['is-circle','is-rounded','is-square'];

  class JobMountAvatar
  {
    constructor(service)
    {
      this.service = service;
    }

    resolveTarget(target)
    {
      if (!target) return null;
      if (typeof target === 'string') return document.querySelector(target);
      if (target && target.nodeType === 1) return target;
      return null;
    }

    mount(target, node, classRoot)
    {
      var el = this.resolveTarget(target);
      if (!el) return null;
      // クリアしてから追加（avatarは単一想定）
      while (el.firstChild) el.removeChild(el.firstChild);
      if (classRoot) el.classList.add(classRoot + '-host');
      el.appendChild(node);
      return node;
    }

    applyShape(node, shape) {
      if (!node) return;
      SHAPE_CLASSES.forEach(function (c) { node.classList.remove(c); });
      var cls = 'is-' + String(shape || 'circle');
      node.classList.add(cls);
      // 補助: CSSがない環境でも形状を表現できるように border-radius を付与
      var radius = '0%';
      if (shape === 'rounded') radius = '12%';
      if (shape === 'circle') radius = '50%';
      node.style.borderRadius = radius;
      var img = node.querySelector('img');
      if (img) img.style.borderRadius = radius;
    }

    remove(node) {
      if (!node) return;
      if (node.parentNode) node.parentNode.removeChild(node);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserAvatar || (Services.UserAvatar = {});
  NS.JobMountAvatar = NS.JobMountAvatar || JobMountAvatar;    

})(window, document);
