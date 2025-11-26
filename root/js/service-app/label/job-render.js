(function () {
  'use strict';

  /**
   * DOM 生成/更新/削除を担当するジョブ
   */
  class JobRender
  {
    constructor(service)
    {
      this.service = service;
    }

    _normalizeClassTokens(value) {
      if (value == null) return [];
      if (Array.isArray(value)) {
        var self = this;
        return value.reduce(function (acc, item) {
          return acc.concat(self._normalizeClassTokens(item));
        }, []);
      }
      var str = String(value).trim();
      if (!str) return [];
      return str.split(/\s+/).filter(Boolean);
    }

    _buildClassList(baseClass, variantPrefix, variant, existing) {
      // 既存クラスから variantPrefix を持つクラスを除去し、base を確実に維持
      var list = Array.isArray(existing)
        ? existing.slice()
        : this._normalizeClassTokens(existing);
      if (!Array.isArray(list)) list = [];

      var prefixes = this._normalizeClassTokens(variantPrefix);
      if (!prefixes.length) prefixes = ['c-label--'];

      if (prefixes.length) {
        list = list.filter(function (c) {
          return !prefixes.some(function (prefix) {
            return prefix && c.indexOf(prefix) === 0;
          });
        });
      }

      var baseClasses = this._normalizeClassTokens(baseClass);
      if (!baseClasses.length && baseClass !== false) {
        baseClasses = ['c-label'];
      }
      baseClasses.forEach(function (cls) {
        if (cls && list.indexOf(cls) === -1) {
          list.unshift(cls);
        }
      });

      var variants = this._normalizeClassTokens(variant);
      if (!variants.length) return list.join(' ').trim();

      variants.forEach(function (variantName) {
        prefixes.forEach(function (prefix) {
          var composed = prefix ? prefix + variantName : variantName;
          if (list.indexOf(composed) === -1) {
            list.push(composed);
          }
        });
      });

      return list.join(' ').trim();
    }

    create(presentation, cfg /*, opts*/) {
      var tag = String((cfg.elementTag || 'span'));
      var el = document.createElement(tag);

      var baseClass = (cfg.baseClass !== undefined) ? cfg.baseClass : 'c-label';
      var variantPrefix = (cfg.variantPrefix !== undefined) ? cfg.variantPrefix : 'c-label--';

      el.className = this._buildClassList(baseClass, variantPrefix, presentation.variant, baseClass);
      var attrName = cfg.attributeName || 'data-status-key';
      if (presentation.statusKey) el.setAttribute(attrName, presentation.statusKey);
      el.textContent = presentation.text != null ? String(presentation.text) : '';

      return el;
    }

    update(target, updates, cfg) {
      var el = (typeof target === 'string') ? document.getElementById(target) : target;
      if (!el) return false;
      updates = updates || {};

      if (Object.prototype.hasOwnProperty.call(updates, 'text')) {
        el.textContent = String(updates.text || '');
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'variant')) {
        var baseClass = (cfg.baseClass !== undefined) ? cfg.baseClass : 'c-label';
        var variantPrefix = (cfg.variantPrefix !== undefined) ? cfg.variantPrefix : 'c-label--';
        var existing = el.className;
        el.className = this._buildClassList(baseClass, variantPrefix, updates.variant, existing);
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'statusKey')) {
        var attrName = cfg.attributeName || 'data-status-key';
        if (updates.statusKey) el.setAttribute(attrName, String(updates.statusKey));
        else el.removeAttribute(attrName);
      }
      return true;
    }

    remove(target) {
      var el = (typeof target === 'string') ? document.getElementById(target) : target;
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
        return true;
      }
      return false;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Label || (Services.Label = {});
  NS.JobRender = NS.JobRender || JobRender;  

})(window, document);
