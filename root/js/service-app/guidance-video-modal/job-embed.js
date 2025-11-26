(function () {

  'use strict';

  function getQuery(obj)
  {
    var parts = [];
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      if (v === undefined || v === null) continue;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    }
    return parts.length ? ('?' + parts.join('&')) : '';
  }

  class JobEmbed {
    constructor(service) {
      this.service = service;
    }

    parseUrl(url) {
      try {
        var u = new URL(url, w.location && w.location.href ? w.location.href : undefined);
        var host = (u.hostname || '').toLowerCase();
        var pathname = u.pathname || '';
        var searchParams = u.searchParams || new URLSearchParams();

        // YouTube
        if (host.indexOf('youtube.com') > -1 || host.indexOf('youtu.be') > -1) {
          var id = null;
          if (host.indexOf('youtu.be') > -1) {
            id = pathname.replace(/^\//, '');
          } else {
            id = searchParams.get('v');
            if (!id && pathname.indexOf('/embed/') > -1) {
              id = pathname.split('/embed/')[1].split('/')[0];
            }
            if (!id && pathname.indexOf('/shorts/') > -1) {
              id = pathname.split('/shorts/')[1].split('/')[0];
            }
          }
          return { type: 'youtube', id: id || '', url: url };
        }

        // Vimeo
        if (host.indexOf('vimeo.com') > -1) {
          var segs = pathname.split('/').filter(Boolean);
          var vid = segs.length ? segs[segs.length - 1] : '';
          return { type: 'vimeo', id: vid, url: url };
        }

        // MP4 / その他
        if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
          return { type: 'video', id: '', url: url };
        }

        // その他は iframe 埋め込み対象
        return { type: 'iframe', id: '', url: url };
      } catch (e) {
        return { type: 'unknown', id: '', url: url };
      }
    }

    toEmbedSpec(source, cfg) {
      var spec = { kind: 'iframe', src: '', attrs: {} };
      var info = null;

      if (typeof source === 'string') {
        info = this.parseUrl(source);
      } else if (source && typeof source === 'object') {
        // { type, id, url }
        info = Object.assign({}, source);
        if (!info.type && info.url) info = this.parseUrl(info.url);
      }

      if (!info) info = { type: 'unknown', url: '' };

      var auto = cfg && cfg.autoPlay ? 1 : 0;
      var allowed = (cfg && cfg.allowedHosts) || (this.service && this.service.config && this.service.config.allowedHosts) || [];

      if (info.type === 'youtube' && info.id) {
        var params = Object.assign({}, (cfg && cfg.youtubeParams) || this.service.config.youtubeParams || {}, { autoplay: auto });
        spec.kind = 'iframe';
        spec.src = 'https://www.youtube.com/embed/' + encodeURIComponent(info.id) + getQuery(params);
        spec.attrs = { allowfullscreen: cfg.allowFullscreen !== false ? 'true' : null, allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' };
        return spec;
      }

      if (info.type === 'vimeo' && info.id) {
        var vparams = Object.assign({}, (cfg && cfg.vimeoParams) || this.service.config.vimeoParams || {}, { autoplay: auto });
        spec.kind = 'iframe';
        spec.src = 'https://player.vimeo.com/video/' + encodeURIComponent(info.id) + getQuery(vparams);
        spec.attrs = { allowfullscreen: cfg.allowFullscreen !== false ? 'true' : null, allow: 'autoplay; fullscreen; picture-in-picture' };
        return spec;
      }

      if (info.type === 'video' && info.url) {
        spec.kind = 'video';
        spec.src = info.url;
        spec.attrs = { controls: 'true', autoplay: auto ? 'true' : null, playsinline: 'true' };
        return spec;
      }

      // iframe (任意URL) の場合、許可ホストか確認（許可されていない場合は空）
      try {
        var u = new URL(info.url, w.location && w.location.href ? w.location.href : undefined);
        var host = (u.hostname || '').toLowerCase();
        var ok = allowed.some(function (h) { return host === h; });
        if (ok) {
          spec.kind = 'iframe';
          spec.src = info.url;
          spec.attrs = { allowfullscreen: cfg.allowFullscreen !== false ? 'true' : null };
          return spec;
        }
      } catch (e) {}

      // 不明 or 許可外
      spec.kind = 'unknown';
      spec.src = '';
      spec.attrs = {};
      return spec;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.GuidanceVideoModal || (Services.GuidanceVideoModal = {});
  NS.JobEmbed = NS.JobEmbed || JobEmbed;

})(window, document);
