(function () {

  'use strict';

  /**
   * ステータス/表示テキストを決定するジョブ
   */
  class JobResolve
  {
    constructor(service)
    {
      this.service = service;
    }

    _getFirst(obj, keys)
    {
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (obj != null && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
          return obj[k];
        }
      }
      return null;
    }

    _normalizeKey(v)
    {
      if (v == null) return '';
      var s = String(v).trim().toLowerCase();
      return s;
    }

    resolve(item, cfg)
    {
      var statusKey = '';
      var text = '';
      var raw = item;

      if (typeof item === 'string' || typeof item === 'number') {
        statusKey = this._normalizeKey(item);
      } else if (item && typeof item === 'object') {
        var keyCandidate = this._getFirst(item, (cfg.statusKeyCandidates || ['status', 'state', 'key', 'code']));
        statusKey = this._normalizeKey(keyCandidate);

        var textCandidate = this._getFirst(item, (cfg.textKeyCandidates || ['label', 'text', 'name', 'title']));
        if (textCandidate != null) text = String(textCandidate);
      }

      if (!text) {
        if (statusKey && cfg.labelMap && cfg.labelMap[statusKey] != null) {
          text = String(cfg.labelMap[statusKey]);
        } else {
          text = cfg.fallbackText || '-';
        }
      }

      var hasVariantMapEntry = Boolean(statusKey && cfg && cfg.variantMap && Object.prototype.hasOwnProperty.call(cfg.variantMap, statusKey));
      var variant;
      if (hasVariantMapEntry) {
        var mappedVariant = cfg.variantMap[statusKey];
        variant = (mappedVariant == null) ? '' : String(mappedVariant);
      } else if (cfg && Object.prototype.hasOwnProperty.call(cfg, 'defaultVariant')) {
        var defaultVariant = cfg.defaultVariant;
        variant = (defaultVariant == null) ? '' : String(defaultVariant);
      } else {
        variant = 'neutral';
      }

      var presentation = {
        __isLabelPresentation: true,
        text: text,
        statusKey: statusKey,
        variant: variant,
        raw: raw
      };
      return presentation;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Label || (Services.Label = {});
  NS.JobResolve = NS.JobResolve || JobResolve;    

})(window, document);
