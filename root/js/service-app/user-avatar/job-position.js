
(function () {

  'use strict';

  var w = window;

  function normOffset(offset)
  {
    if (typeof offset === 'number') return { x: 0, y: Number(offset) };
    offset = offset || { x: 0, y: 0 };
    var x = Number(offset.x || 0);
    var y = Number(offset.y || 0);
    return { x: x, y: y };
  }

  class JobPosition
  {
    constructor(service)
    {
      this.service = service;
    }

    place(pop, anchor, opts)
    {
      if (!pop || !anchor) return;
      var placement = String((opts && opts.placement) || 'bottom-end');
      var off = normOffset(opts && opts.offset);

      // 測定
      var ar = anchor.getBoundingClientRect();
      var pr = pop.getBoundingClientRect();
      var sx = w.pageXOffset || document.documentElement.scrollLeft || 0;
      var sy = w.pageYOffset || document.documentElement.scrollTop || 0;

      var base = placement.split('-')[0];     // top/bottom/left/right
      var align = placement.split('-')[1] || 'center'; // start/end/center

      var top = 0, left = 0;

      if (base === 'bottom') {
        top = ar.bottom + sy + off.y;
        if (align === 'start') left = ar.left + sx;
        else if (align === 'end') left = ar.right + sx - pr.width;
        else left = ar.left + sx + (ar.width - pr.width) / 2;
      } else if (base === 'top') {
        top = ar.top + sy - pr.height - off.y;
        if (align === 'start') left = ar.left + sx;
        else if (align === 'end') left = ar.right + sx - pr.width;
        else left = ar.left + sx + (ar.width - pr.width) / 2;
      } else if (base === 'right') {
        left = ar.right + sx + off.x;
        if (align === 'start') top = ar.top + sy;
        else if (align === 'end') top = ar.bottom + sy - pr.height;
        else top = ar.top + sy + (ar.height - pr.height) / 2;
      } else if (base === 'left') {
        left = ar.left + sx - pr.width - off.x;
        if (align === 'start') top = ar.top + sy;
        else if (align === 'end') top = ar.bottom + sy - pr.height;
        else top = ar.top + sy + (ar.height - pr.height) / 2;
      } else {
        // フォールバック: bottom-end
        top = ar.bottom + sy + off.y;
        left = ar.right + sx - pr.width;
      }

      // 画面外へのはみ出しを簡易補正（過度な複雑化は避ける）
      var vw = w.innerWidth || document.documentElement.clientWidth;
      var vh = w.innerHeight || document.documentElement.clientHeight;
      if (left < 0) left = 0;
      if (top < 0) top = 0;
      if (left + pr.width > sx + vw) left = Math.max(0, sx + vw - pr.width);
      if (top + pr.height > sy + vh) top = Math.max(0, sy + vh - pr.height);

      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      try {
        pop.setAttribute('data-placement', placement);
      } catch (e) {}
      return { top: top, left: left, placementUsed: placement };
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserAvatar || (Services.UserAvatar = {});
  NS.JobPosition = NS.JobPosition || JobPosition;

})(window, document);
