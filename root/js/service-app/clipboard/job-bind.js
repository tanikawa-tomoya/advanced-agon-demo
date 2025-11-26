(function () {
  'use strict';
  
  /**
   * クリック要素に「コピー」動作を付与するジョブ
   * - ターゲットは要素/NodeList/配列/セレクタ文字列のいずれか
   * - getText は string/関数/Promise を許容
   * - onSuccess/onError をコールバック
   */
  class JobBind
  {
    constructor(service)
    {
      this.service = service;
    }

    bindCopyOnClick(target, getText, onSuccess, onError)
    {
      var els = this._resolveElements(target);
      var disposers = [];

      for (var i = 0; i < els.length; i++) {
        (function (el, service, self) {
          var handler = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            // 文字列を取得（Promise も許容）
            var val;
            try {
              val = (typeof getText === 'function') ? getText(el) : getText;
            } catch (e) {
              if (typeof onError === 'function') onError(e, el);
              return;
            }
            if (val && typeof val.then === 'function') {
              val.then(function (resolved) {
                self._doCopy(resolved, el, onSuccess, onError);
              }).catch(function (err) {
                if (typeof onError === 'function') onError(err, el);
              });
            } else {
              self._doCopy(val, el, onSuccess, onError);
            }
          };
          el.addEventListener('click', handler, true);
          disposers.push(function () {
            el.removeEventListener('click', handler, true);
          });
        })(els[i], this.service, this);
      }

      return disposers;
    }

    _doCopy(text, el, onSuccess, onError)
    {
      var self = this;
      this.service.jobs.api.writeText(String(text == null ? '' : text))
        .then(function () {
          if (typeof onSuccess === 'function') onSuccess(String(text == null ? '' : text), el);
        })
        .catch(function (err) {
          if (typeof onError === 'function') onError(err, el);
        });
    }

    _resolveElements(target)
    {
      if (!target) return [];
      if (typeof target === 'string') {
        var list = document.querySelectorAll(target);
        return Array.prototype.slice.call(list);
      }
      if (target instanceof Element) return [target];
      if (target instanceof NodeList) return Array.prototype.slice.call(target);
      if (Array.isArray(target)) return target.filter(function (n) { return n && n.nodeType === 1; });
      return [];
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Clipboard || (Services.Clipboard = {});
  NS.JobBind = NS.JobBind || JobBind;

})(window, document);
