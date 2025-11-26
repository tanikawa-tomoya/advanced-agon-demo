(function () {

  'use strict';

  function clamp(v, min, max)
  {
    return Math.max(min, Math.min(max, v));
  }

  class JobPosition
  {
    constructor(service)
    {
      this.service = service;
    }

    place(tip, target, placement, offset)
    {
      if (!tip || !target) return;
      placement = String(placement || 'top');
      offset = (typeof offset === 'number') ? offset : 8;

      var rect = target.getBoundingClientRect();
      var tipRect;

      // まず off-screen で仮レイアウト
      tip.style.visibility = 'hidden';
      tip.style.top = '0px';
      tip.style.left = '0px';
      tip.style.transform = '';
      tip.style.maxWidth = 'none';
      tip.style.whiteSpace = 'nowrap';

      // レイアウト計測
      tipRect = tip.getBoundingClientRect();

      var scrollX = w.pageXOffset || document.documentElement.scrollLeft || 0;
      var scrollY = w.pageYOffset || document.documentElement.scrollTop || 0;

      var top = 0, left = 0;

      if (placement === 'top') {
        top = rect.top + scrollY - tipRect.height - offset;
        left = rect.left + scrollX + (rect.width - tipRect.width) / 2;
      } else if (placement === 'bottom') {
        top = rect.bottom + scrollY + offset;
        left = rect.left + scrollX + (rect.width - tipRect.width) / 2;
      } else if (placement === 'left') {
        top = rect.top + scrollY + (rect.height - tipRect.height) / 2;
        left = rect.left + scrollX - tipRect.width - offset;
      } else { // right
        top = rect.top + scrollY + (rect.height - tipRect.height) / 2;
        left = rect.right + scrollX + offset;
      }

      // 画面に収める（簡易クランプ）
      var vw = w.innerWidth || document.documentElement.clientWidth;
      var vh = w.innerHeight || document.documentElement.clientHeight;
      left = clamp(left, 0, scrollX + vw - tipRect.width);
      top  = clamp(top, 0, scrollY + vh - tipRect.height);

      tip.style.top = top + 'px';
      tip.style.left = left + 'px';
      tip.style.visibility = '';
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Tooltip || (Services.Tooltip = {});
  NS.JobPosition = NS.JobPosition || JobPosition;      

})(window, document);
