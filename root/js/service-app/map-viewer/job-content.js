(function () {

  'use strict';

  function encode(v)
  {
    return encodeURIComponent(String(v == null ? '' : v));
  }
  
  class JobContent
  {
    constructor(service)
    {
      this.service = service;
    }

    apply(parts, cfg)
    {
      if (!parts) return;
      // texts
      parts.title.textContent = cfg.title || '';
      parts.subtitle.textContent = cfg.subtitle || '';
      parts.address.textContent = cfg.address || '';

      // url
      var url = this.buildEmbedUrl(cfg);
      parts.iframe.src = url;

      // link
      var ext = this.buildExternalUrl(cfg);
      parts.link.textContent = cfg.linkText || 'Open in Maps';
      parts.link.href = ext;
      parts.link.target = cfg.linkTarget || '_blank';
    }

    buildEmbedUrl(cfg) {
      var provider = String(cfg.provider || 'google').toLowerCase();
      var lat = (cfg.center && typeof cfg.center.lat === 'number') ? cfg.center.lat : null;
      var lon = (cfg.center && typeof cfg.center.lon === 'number') ? cfg.center.lon : null;
      var zoom = (cfg.zoom != null) ? Number(cfg.zoom) : 14;
      var q = (cfg.query != null && String(cfg.query).trim().length) ? String(cfg.query) : null;

      if (provider === 'google') {
        // 座標優先、なければクエリ
        if (lat != null && lon != null) {
          return 'https://www.google.com/maps?q=' + encode(lat + ',' + lon) + '&z=' + encode(zoom) + '&output=embed';
        }
        if (q) {
          return 'https://www.google.com/maps?q=' + encode(q) + '&z=' + encode(zoom) + '&output=embed';
        }
        return 'https://www.google.com/maps?output=embed';
      }

      // OpenStreetMap（簡易）
      if (lat != null && lon != null) {
        // export/embed.html 形式（bbox は簡易に中心周辺を固定幅で切り出し）
        var span = 0.05; // 簡易
        var minLon = lon - span, minLat = lat - span, maxLon = lon + span, maxLat = lat + span;
        var bbox = [minLon, minLat, maxLon, maxLat].join('%2C');
        return 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + encode(lat + ',' + lon);
      }
      if (q) {
        return 'https://www.openstreetmap.org/search?query=' + encode(q);
      }
      return 'https://www.openstreetmap.org/';
    }

    buildExternalUrl(cfg) {
      var provider = String(cfg.provider || 'google').toLowerCase();
      var lat = (cfg.center && typeof cfg.center.lat === 'number') ? cfg.center.lat : null;
      var lon = (cfg.center && typeof cfg.center.lon === 'number') ? cfg.center.lon : null;
      var zoom = (cfg.zoom != null) ? Number(cfg.zoom) : 14;
      var q = (cfg.query != null && String(cfg.query).trim().length) ? String(cfg.query) : null;

      if (provider === 'google') {
        if (lat != null && lon != null) {
          return 'https://www.google.com/maps?q=' + encode(lat + ',' + lon) + '&z=' + encode(zoom);
        }
        if (q) {
          return 'https://www.google.com/maps?q=' + encode(q) + '&z=' + encode(zoom);
        }
        return 'https://www.google.com/maps';
      }
      if (lat != null && lon != null) {
        return 'https://www.openstreetmap.org/#map=' + encode(zoom) + '/' + encode(lat) + '/' + encode(lon);
      }
      if (q) {
        return 'https://www.openstreetmap.org/search?query=' + encode(q);
      }
      return 'https://www.openstreetmap.org/';
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.MapViewer || (Services.MapViewer = {});
  NS.JobContent = NS.JobContent || JobContent;    

})(window, document);
