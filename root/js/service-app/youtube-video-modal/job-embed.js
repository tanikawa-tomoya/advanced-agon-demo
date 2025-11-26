(function () {

  'use strict';

  var w = window;

  class JobEmbed
  {
    constructor(service)
    {
      this.service = service;
    }

    parseYouTubeId(urlOrId)
    {
      if (typeof urlOrId !== 'string') return null;
      var s = urlOrId.trim();
      if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
      try {
        var u = new URL(s, w.location.href);
        var host = (u.hostname || '').toLowerCase();
        if (host === 'youtu.be') {
          var parts = (u.pathname || '').split('/').filter(function (p) { return !!p; });
          return parts[0] || null;
        }
        if (host.indexOf('youtube.com') !== -1) {
          if ((u.pathname || '').indexOf('/watch') === 0) {
            return u.searchParams.get('v');
          }
          if ((u.pathname || '').indexOf('/embed/') === 0) {
            var xs = u.pathname.split('/');
            return xs[2] || null;
          }
          var shorts = (u.pathname || '').match(/\/shorts\/([^/?#]+)/);
          if (shorts && shorts[1]) return shorts[1];
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    buildEmbedUrl(id, params)
    {
      var query = '';
      if (params && typeof params === 'object') {
        var q = [];
        for (var key in params) {
          if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
          var val = params[key];
          if (val === undefined || val === null) continue;
          q.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
        }
        if (q.length) query = '?' + q.join('&');
      }
      return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + query;
    }

    createIframe(embedSpec, allowFullscreen, iframeAllow)
    {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('src', embedSpec.src);
      iframe.setAttribute('title', String(embedSpec.title || 'YouTube video'));
      if (allowFullscreen) {
        iframe.setAttribute('allowfullscreen', 'allowfullscreen');
      }
      if (iframeAllow) {
        iframe.setAttribute('allow', iframeAllow);
      }
      iframe.setAttribute('loading', 'lazy');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      return iframe;
    }

    toEmbedSpec(url, cfg)
    {
      var id = this.parseYouTubeId(url);
      if (!id) throw new Error('youtube-video-modal: invalid YouTube url');
      var params = Object.assign({}, cfg.youtubeParams || {});
      if (cfg.autoplay) params.autoplay = 1;
      return {
        id: id,
        src: this.buildEmbedUrl(id, params),
        title: cfg.title || 'YouTube video'
      };
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.YoutubeVideoModal || (Services.YoutubeVideoModal = {});
  NS.JobEmbed = NS.JobEmbed || JobEmbed;

})(window, document);
